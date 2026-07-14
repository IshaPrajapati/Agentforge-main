import { Annotation, StateGraph, END } from '@langchain/langgraph'
import { runAgent1 } from '../agents/agent1.js'
import { runAgent2 } from '../agents/agent2.js'
import { runAgent3 } from '../agents/agent3.js'
import { runModerator } from '../agents/moderator.js'
import { AgentHistory, Project } from '../../config/jsonDatabase.js'
import { recordAudit } from '../auditService.js'
import {
  createNotionProjectPage,
  appendAgent1OutputToNotion,
  updateNotionAfterAgent2,
  finalizeNotionProject,
} from '../integrations/notion.js'
import logger from '../../utils/logger.js'

const WorkflowState = Annotation.Root({
  projectId: Annotation(),
  agent1Output: Annotation(),
  agent2Output: Annotation(),
  moderatorOutput: Annotation(),
  agent3Output: Annotation(),
  approvalRequired: Annotation(),
  phase: Annotation(),
  notionPageId: Annotation(),
})

async function recordHistory(projectId, agent, action, input, output, reasoning, durationMs, status = 'success') {
  await AgentHistory.create({
    projectId,
    agent,
    action,
    input,
    output,
    reasoning: reasoning || output?.reasoning,
    durationMs,
    status,
  })
}

async function agent1Node(state) {
  const project = await Project.findById(state.projectId)
  await Project.findByIdAndUpdate(state.projectId, { status: 'agent1_running', currentStep: 'Agent 1: Requirement Analysis' })

  // Create Notion page immediately (Status: Planning) so it exists from the start
  const notionResult = await createNotionProjectPage({
    name: project.name,
    description: project.description,
    budget: project.budget,
    timelineDays: project.timelineDays,
    priority: project.priority,
  })
  const notionPageId = notionResult.notionPageId

  // Save notionPageId to project so all subsequent agents can update the same page
  await Project.findByIdAndUpdate(state.projectId, { notionPageId })

  // Run Agent 1 analysis
  const result = await runAgent1(project)

  await recordHistory(state.projectId, 'agent1', 'analyze_requirements', {
    name: project.name, budget: project.budget, timelineDays: project.timelineDays,
  }, result.output, result.output.reasoning, result.durationMs)

  // Append Agent 1 detailed analysis to the existing Notion page
  await appendAgent1OutputToNotion(notionPageId, result.output, project.name)

  await Project.findByIdAndUpdate(state.projectId, {
    status: 'agent1_complete',
    agent1Output: result.output,
    currentStep: 'Agent 1 Complete',
    notionPageUrl: notionResult.pageUrl,
  })

  await recordAudit({
    projectId: state.projectId,
    action: 'AGENT1_COMPLETE',
    details: {
      modules: result.output.modules?.length,
      notionPageId,
      notionSimulated: notionResult.simulated,
    },
  })

  return { ...state, agent1Output: result.output, phase: 'agent1_done', notionPageId }
}

async function agent2Node(state) {
  const project = await Project.findById(state.projectId)
  await Project.findByIdAndUpdate(state.projectId, { status: 'agent2_running', currentStep: 'Agent 2: Feasibility Review' })

  const result = await runAgent2(project, state.agent1Output)

  await recordHistory(state.projectId, 'agent2', 'feasibility_review', state.agent1Output, result.output, result.output.reasoning, result.durationMs)

  const approvalRequired = result.output.approval_required
  const newStatus = approvalRequired ? 'awaiting_approval' : 'approved'
  const currentStep = approvalRequired ? 'Awaiting Manager Approval' : 'Auto-Approved — Running Agent 3'

  // Update Notion page with Agent 2 analysis and new status
  await updateNotionAfterAgent2(state.notionPageId, result.output, project.name)

  await Project.findByIdAndUpdate(state.projectId, {
    status: newStatus,
    agent2Output: result.output,
    currentStep,
  })

  await recordAudit({
    projectId: state.projectId,
    action: 'AGENT2_COMPLETE',
    details: { approval_required: approvalRequired, status: result.output.status },
  })

  let moderatorOutput = null
  if (result.output.conflict_object) {
    const modResult = await runModerator(state.agent1Output, result.output)
    moderatorOutput = modResult.output
    
    await recordHistory(state.projectId, 'moderator', 'summarize_debate', {
      agent1: state.agent1Output,
      agent2Conflict: result.output.conflict_object
    }, moderatorOutput, 'Debate summarized.', modResult.durationMs)

    await Project.findByIdAndUpdate(state.projectId, {
      moderatorOutput
    })
    
    await recordAudit({
      projectId: state.projectId,
      action: 'MODERATOR_COMPLETE',
      details: { confidence: moderatorOutput.confidence }
    })
  }

  if (approvalRequired) {
    await recordAudit({ projectId: state.projectId, action: 'APPROVAL_GATE', details: { message: 'Workflow paused for human approval' } })
  }

  return {
    ...state,
    agent2Output: result.output,
    moderatorOutput,
    approvalRequired,
    phase: approvalRequired ? 'awaiting_approval' : 'approved',
  }
}

async function agent3Node(state) {
  const project = await Project.findById(state.projectId)
  await Project.findByIdAndUpdate(state.projectId, { status: 'agent3_running', currentStep: 'Agent 3: Execution' })

  const result = await runAgent3(project, state.agent1Output)

  await recordHistory(state.projectId, 'agent3', 'execute_integrations', state.agent1Output, result.output, result.output.reasoning, result.durationMs)

  // Finalize Notion page with GitHub issues, integrations, audit log
  const notionFinal = await finalizeNotionProject(state.notionPageId, {
    projectName: project.name,
    agent1Output: state.agent1Output,
    agent3Output: result.output,
    decision: 'approve',
  })

  await Project.findByIdAndUpdate(state.projectId, {
    status: 'completed',
    agent3Output: result.output,
    integrations: {
      ...result.output.integrations,
      notion: {
        updated: notionFinal.updated,
        pageUrl: notionFinal.pageUrl || project.notionPageUrl,
        simulated: notionFinal.simulated,
      },
    },
    currentStep: 'Completed',
  })

  await recordAudit({ projectId: state.projectId, action: 'AGENT3_COMPLETE', details: result.output.integrations })
  await recordAudit({ projectId: state.projectId, action: 'WORKFLOW_COMPLETE', details: { projectName: project.name } })

  return { ...state, agent3Output: result.output, phase: 'completed' }
}

function routeAfterAgent2(state) {
  if (state.approvalRequired) return 'end_awaiting'
  return 'agent3'
}

export function buildWorkflowGraph() {
  const graph = new StateGraph(WorkflowState)

  graph.addNode('agent1', agent1Node)
  graph.addNode('agent2', agent2Node)
  graph.addNode('agent3', agent3Node)

  graph.setEntryPoint('agent1')
  graph.addEdge('agent1', 'agent2')
  graph.addConditionalEdges('agent2', routeAfterAgent2, {
    end_awaiting: END,
    agent3: 'agent3',
  })
  graph.addEdge('agent3', END)

  return graph.compile()
}

export async function runWorkflowUntilApproval(projectId) {
  const graph = buildWorkflowGraph()
  logger.info('Starting workflow', { projectId })

  const result = await graph.invoke({ projectId, phase: 'started' })
  return result
}

export async function resumeWorkflowAfterApproval(projectId, decision) {
  const project = await Project.findById(projectId)
  if (!project) throw new Error('Project not found')

  const notionPageId = project.notionPageId

  if (decision === 'reject') {
    await Project.findByIdAndUpdate(projectId, { status: 'rejected', currentStep: 'Rejected by Manager' })
    await recordAudit({ projectId, action: 'MANAGER_REJECTED', details: { decision } })

    // Finalize Notion page with rejected status
    await finalizeNotionProject(notionPageId, {
      projectName: project.name,
      agent1Output: project.agent1Output,
      agent3Output: { integrations: {}, issues_created: [], audit_log: 'Project rejected by manager.' },
      decision: 'reject',
    })

    return { phase: 'rejected' }
  }

  if (decision === 'more_info') {
    await Project.findByIdAndUpdate(projectId, { status: 'agent2_complete', currentStep: 'More Information Requested' })
    await recordAudit({ projectId, action: 'MANAGER_MORE_INFO', details: { decision } })
    return { phase: 'more_info' }
  }

  // Approved — run Agent 3
  await Project.findByIdAndUpdate(projectId, { status: 'approved', currentStep: 'Approved — Running Agent 3' })
  await recordAudit({ projectId, action: 'MANAGER_APPROVED', details: { decision } })

  const result = await runAgent3(project, project.agent1Output)
  await recordHistory(projectId, 'agent3', 'execute_integrations', project.agent1Output, result.output, result.output.reasoning, result.durationMs)

  // Finalize Notion page
  const notionFinal = await finalizeNotionProject(notionPageId, {
    projectName: project.name,
    agent1Output: project.agent1Output,
    agent3Output: result.output,
    decision: 'approve',
  })

  await Project.findByIdAndUpdate(projectId, {
    status: 'completed',
    agent3Output: result.output,
    integrations: {
      ...result.output.integrations,
      notion: {
        updated: notionFinal.updated,
        pageUrl: notionFinal.pageUrl || project.notionPageUrl,
        simulated: notionFinal.simulated,
      },
    },
    currentStep: 'Completed',
  })

  await recordAudit({ projectId, action: 'AGENT3_COMPLETE', details: result.output.integrations })
  await recordAudit({ projectId, action: 'WORKFLOW_COMPLETE', details: { projectName: project.name } })

  return { phase: 'completed', agent3Output: result.output }
}
