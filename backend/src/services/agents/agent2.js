import { config } from '../../config/index.js'
import logger from '../../utils/logger.js'

const MANAGER_PROMPT = `You are Agent 2: Senior Engineering Manager and Technical Architect.
Validate timeline, budget, complexity, risk, security, and policy compliance.
If you strongly disagree with Agent 1's plan (e.g. unrealistic timeline, high risk), you MUST include a "conflict_object" with: disagreement_reason, supporting_evidence, risk_comparison, alternative_recommendation.
Output ONLY valid JSON with: status, approval_required, budget_analysis, timeline_analysis, risk_analysis, recommendation, manager_summary, confidence, and (optional) conflict_object.`

async function callLLM(systemPrompt, userPrompt) {
  if (!config.openai.apiKey) return null
  try {
    const { ChatOpenAI } = await import('@langchain/openai')
    const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0.1, apiKey: config.openai.apiKey })
    const response = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
    const jsonMatch = response.content.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : response.content)
  } catch (err) {
    logger.warn('Agent 2 LLM failed, using rule engine', { error: err.message })
    return null
  }
}

function ruleBasedValidation(project, agent1Output) {
  const { budget, timelineDays } = project
  const { total_estimated_days, risk_level, confidence_score, modules } = agent1Output
  const dailyRate = budget / timelineDays
  const buffer = timelineDays - total_estimated_days
  const approvalRequired = buffer <= 3 || risk_level === 'high' || confidence_score < 70

  let status = 'feasible'
  if (total_estimated_days > timelineDays * 1.2) status = 'not_feasible'
  else if (approvalRequired) status = 'feasible_with_conditions'

  return {
    status,
    approval_required: approvalRequired,
    budget_analysis: `₹${budget.toLocaleString('en-IN')} over ${timelineDays} days = ~₹${Math.round(dailyRate).toLocaleString('en-IN')}/day for ${modules.length} modules. ${dailyRate < 3000 ? 'Budget is very tight.' : 'Budget is adequate for MVP.'}`,
    timeline_analysis: `Estimated ${total_estimated_days} days vs ${timelineDays}-day deadline. Buffer: ${buffer} days. ${buffer <= 0 ? 'ZERO buffer — any blocker causes slip.' : 'Schedule has limited margin.'}`,
    risk_analysis: `Risk level: ${risk_level}. Key risks: (1) schedule pressure, (2) scope creep, (3) integration complexity, (4) single-developer dependency. Confidence from Agent 1: ${confidence_score}%.`,
    recommendation: approvalRequired
      ? 'APPROVE WITH CONDITIONS — lock MVP scope, assign dedicated team, defer non-critical features to Phase 2.'
      : 'APPROVE — project is within budget and timeline with acceptable risk.',
    manager_summary: `Project "${project.name}" reviewed. Status: ${status}. ${approvalRequired ? 'Human approval REQUIRED before execution.' : 'Auto-approved for execution.'}`,
    confidence: Math.min(confidence_score, buffer > 2 ? 80 : 60),
    reasoning: `Validated ${modules.length} modules against ₹${budget} budget and ${timelineDays}-day timeline. Approval gate: ${approvalRequired ? 'ON' : 'OFF'}.`,
    ...(approvalRequired && {
      conflict_object: {
        disagreement_reason: buffer <= 0 ? 'Timeline is unrealistic and has zero buffer.' : 'Risk level is too high for auto-approval.',
        supporting_evidence: `Agent 1 estimated ${total_estimated_days} days, but deadline is ${timelineDays} days. Risk is ${risk_level}.`,
        risk_comparison: 'Agent 1 assumed ideal conditions. Real-world execution will likely slip by 20-30%.',
        alternative_recommendation: 'Reduce scope by cutting the lowest priority module, or extend timeline by 20%.'
      }
    })
  }
}

export async function runAgent2(project, agent1Output) {
  const start = Date.now()
  const userPrompt = `Project: ${JSON.stringify({ name: project.name, budget: project.budget, timelineDays: project.timelineDays, priority: project.priority })}
Agent 1 Plan: ${JSON.stringify(agent1Output)}`

  let output = await callLLM(MANAGER_PROMPT, userPrompt)
  if (!output) {
    output = ruleBasedValidation(project, agent1Output)
  }

  if (!output.reasoning) {
    output.reasoning = `Feasibility review complete. Approval required: ${output.approval_required}.`
  }

  return {
    output,
    durationMs: Date.now() - start,
    usedLLM: !!config.openai.apiKey,
  }
}
