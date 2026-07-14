import { config } from '../../config/index.js'
import logger from '../../utils/logger.js'

const MODERATOR_PROMPT = `You are the AI Moderator. 
Agent 1 provided a recommendation. Agent 2 disagreed and generated a Conflict Object.
Your job is to act as an objective third party and summarize the debate for the Human Manager.
DO NOT replace either agent. Just enrich the decision-making process.
Output ONLY valid JSON with:
{
  "pros": ["pro1", "pro2"],
  "cons": ["con1", "con2"],
  "best_recommendation": "objective recommendation balancing both sides",
  "confidence": 85
}`

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
    logger.warn('Moderator LLM failed, using rule engine', { error: err.message })
    return null
  }
}

function ruleBasedModeration(agent1Output, agent2Output) {
  const conflict = agent2Output.conflict_object || {}
  return {
    pros: [
      'Agent 1 provided a structured plan and breakdown.',
      'Core requirements are addressed in the proposed modules.'
    ],
    cons: [
      conflict.disagreement_reason || 'Agent 2 raised feasibility concerns.',
      conflict.risk_comparison || 'Risk levels are elevated.'
    ],
    best_recommendation: conflict.alternative_recommendation || 'Proceed with caution and consider Agent 2\'s alternative.',
    confidence: Math.round((agent1Output.confidence_score + agent2Output.confidence) / 2) || 70,
    is_rule_based: true
  }
}

export async function runModerator(agent1Output, agent2Output) {
  const start = Date.now()
  const userPrompt = `
Agent 1 Output: ${JSON.stringify(agent1Output)}
Agent 2 Conflict: ${JSON.stringify(agent2Output.conflict_object)}
`

  let output = await callLLM(MODERATOR_PROMPT, userPrompt)
  if (!output) {
    output = ruleBasedModeration(agent1Output, agent2Output)
  }

  return {
    output,
    durationMs: Date.now() - start,
    usedLLM: !!config.openai.apiKey,
  }
}
