import { Project, AgentHistory, AuditLog } from '../config/jsonDatabase.js'
import { runWorkflowUntilApproval, resumeWorkflowAfterApproval } from './orchestrator/workflow.js'
import { recordAudit } from './auditService.js'
import logger from '../utils/logger.js'
import { runAgent1 } from './agents/agent1.js'
import { runAgent2 } from './agents/agent2.js'
import { runModerator } from './agents/moderator.js'
import { config } from '../config/index.js'

export async function createProject(data, userId) {
  const project = await Project.create({
    ...data,
    submittedBy: userId,
    status: 'submitted',
    currentStep: 'Submitted',
  })

  await recordAudit({ projectId: project._id, userId, action: 'PROJECT_SUBMITTED', details: { name: data.name } })

  setImmediate(async () => {
    try {
      await runWorkflowUntilApproval(project._id.toString())
    } catch (err) {
      logger.error('Workflow failed', { projectId: project._id, error: err.message })
      await Project.findByIdAndUpdate(project._id, { status: 'failed', error: err.message })
    }
  })

  return project
}

export async function approveProject(projectId, { decision, notes, userId }) {
  const project = await Project.findById(projectId)
  if (!project) throw new Error('Project not found')
  if (project.status !== 'awaiting_approval') {
    throw new Error(`Cannot approve project in status: ${project.status}`)
  }

  await Project.findByIdAndUpdate(projectId, {
    approvalDecision: decision,
    approvalNotes: notes,
    approvedBy: userId,
  })

  const result = await resumeWorkflowAfterApproval(projectId, decision)
  const updated = await Project.findById(projectId)
  return { project: updated, workflowResult: result }
}

export async function getProjectById(id) {
  const project = await Project.findById(id)
  if (!project) return null
  return Project.populate(project, 'submittedBy')
}

export async function listProjects(filter = {}) {
  let projects = await Project.find(filter)
  projects = Project.sort(projects, { createdAt: -1 })
  return projects.map((p) => Project.populate(p, 'submittedBy'))
}

export async function getProjectTimeline(projectId) {
  const [history, audits] = await Promise.all([
    AgentHistory.find({ projectId }),
    AuditLog.find({ projectId }),
  ])

  const sortedHistory = AgentHistory.sort(history, { createdAt: 1 })
  const sortedAudits = AuditLog.sort(audits, { createdAt: 1 })

  const events = [
    ...sortedHistory.map((h) => ({
      type: 'agent',
      agent: h.agent,
      action: h.action,
      reasoning: h.reasoning,
      status: h.status,
      durationMs: h.durationMs,
      timestamp: h.createdAt,
    })),
    ...sortedAudits.map((a) => ({
      type: 'audit',
      action: a.action,
      details: a.details,
      timestamp: a.createdAt,
    })),
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  return events
}

export async function getDashboardStats(filter = {}) {
  const [total, awaiting, completed, rejected, failed] = await Promise.all([
    Project.countDocuments(filter),
    Project.countDocuments({ ...filter, status: 'awaiting_approval' }),
    Project.countDocuments({ ...filter, status: 'completed' }),
    Project.countDocuments({ ...filter, status: 'rejected' }),
    Project.countDocuments({ ...filter, status: 'failed' }),
  ])

  let recent = await Project.find(filter)
  recent = Project.sort(recent, { createdAt: -1 }).slice(0, 5)
  recent = recent.map(({ name, status, currentStep, createdAt, _id }) => ({
    _id, name, status, currentStep, createdAt,
  }))

  return { total, awaiting, completed, rejected, failed, recent }
}

async function generateComparison(originalProject, updatedProject, originalAgent1, originalAgent2, updatedAgent1, updatedAgent2) {
  if (!config.openai.apiKey) return { what_changed: 'Simulation run.', why_it_changed: 'Modified inputs.', expected_impact: 'Unknown.' }
  try {
    const { ChatOpenAI } = await import('@langchain/openai')
    const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0.1, apiKey: config.openai.apiKey })
    const prompt = `You are an AI Scenario Planner.
Compare the Original Plan vs Updated Plan.
Original Inputs: Budget ₹${originalProject.budget}, Timeline ${originalProject.timelineDays} days, Priority ${originalProject.priority}
Updated Inputs: Budget ₹${updatedProject.budget}, Timeline ${updatedProject.timelineDays} days, Priority ${updatedProject.priority}

Original Output:
Timeline: ${originalAgent1?.total_estimated_days || 0} days
Risk: ${originalAgent1?.risk_level || 'N/A'}
Budget status: ${originalAgent2?.budget_analysis || 'N/A'}
Recommendation: ${originalAgent2?.recommendation || 'N/A'}

Updated Output:
Timeline: ${updatedAgent1?.total_estimated_days || 0} days
Risk: ${updatedAgent1?.risk_level || 'N/A'}
Budget status: ${updatedAgent2?.budget_analysis || 'N/A'}
Recommendation: ${updatedAgent2?.recommendation || 'N/A'}

Provide a JSON object with:
{
  "what_changed": "Brief summary of input changes",
  "why_it_changed": "Why the outputs changed as a result",
  "expected_impact": "Impact on risk, timeline, etc."
}
Output ONLY valid JSON.`
    
    const response = await llm.invoke([{ role: 'user', content: prompt }])
    const jsonMatch = response.content.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : response.content)
  } catch (err) {
    logger.error('Comparison generation failed', { error: err.message })
    return { what_changed: 'Simulation completed.', why_it_changed: 'Modified parameters.', expected_impact: 'See updated outputs.' }
  }
}

export async function simulateScenario(projectId, modifications) {
  const originalProject = await Project.findById(projectId)
  if (!originalProject) throw new Error('Project not found')
  
  const mockProject = {
    ...originalProject,
    ...modifications
  }

  const agent1Result = await runAgent1(mockProject)
  const agent1Output = agent1Result.output
  
  const agent2Result = await runAgent2(mockProject, agent1Output)
  const agent2Output = agent2Result.output
  
  let moderatorOutput = null
  if (agent2Output.conflict_object) {
    const modResult = await runModerator(agent1Output, agent2Output)
    moderatorOutput = modResult.output
  }
  
  const comparison = await generateComparison(
    originalProject, mockProject, 
    originalProject.agent1Output, originalProject.agent2Output, 
    agent1Output, agent2Output
  )
  
  await recordAudit({ projectId, action: 'SCENARIO_SIMULATION', details: modifications })
  
  return {
    simulatedAgent1Output: agent1Output,
    simulatedAgent2Output: agent2Output,
    simulatedModeratorOutput: moderatorOutput,
    comparison
  }
}

export async function deleteProject(id) {
  const project = await Project.findById(id)
  if (!project) throw new Error('Project not found')

  await Project.deleteOne({ _id: id })
  await AgentHistory.deleteMany({ projectId: id })
  await AuditLog.deleteMany({ projectId: id })

  return { success: true }
}
