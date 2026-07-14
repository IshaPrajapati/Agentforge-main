import { config } from '../../config/index.js'
import logger from '../../utils/logger.js'

const ANALYST_PROMPT = `You are Agent 1: Senior Requirement Analyst with 15 years of experience.
Convert vague software requirements into an executable engineering plan.
Output ONLY valid JSON with: project_summary, modules[], total_estimated_days, risk_level, confidence_score, questions[].
Each module needs: name, description, estimated_days, priority, dependencies[].`

async function callLLM(systemPrompt, userPrompt) {
  if (!config.openai.apiKey) return null

  try {
    const { ChatOpenAI } = await import('@langchain/openai')
    const llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      apiKey: config.openai.apiKey,
    })
    const response = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
    const text = response.content
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
    return JSON.parse(text)
  } catch (err) {
    logger.warn('LLM call failed, using rule engine', { error: err.message })
    return null
  }
}

function ruleBasedAnalysis(project) {
  const { name, description, budget, timelineDays, priority } = project
  const dailyRate = budget / timelineDays

  const modules = [
    {
      name: 'Project Setup & Architecture',
      description: 'Repository structure, API design, database schema, environment configuration',
      estimated_days: 1,
      priority: 'P0',
      dependencies: [],
    },
    {
      name: 'Backend Core API',
      description: `REST API for ${name}: data models, CRUD endpoints, validation, error handling`,
      estimated_days: Math.max(2, Math.floor(timelineDays * 0.25)),
      priority: 'P0',
      dependencies: ['Project Setup & Architecture'],
    },
    {
      name: 'Authentication & Security',
      description: 'JWT authentication, role-based access, input validation, rate limiting',
      estimated_days: Math.max(1, Math.floor(timelineDays * 0.15)),
      priority: 'P1',
      dependencies: ['Backend Core API'],
    },
    {
      name: 'Frontend Application',
      description: `React dashboard for ${name}: forms, tables, responsive layout, API integration`,
      estimated_days: Math.max(2, Math.floor(timelineDays * 0.3)),
      priority: 'P0',
      dependencies: ['Backend Core API'],
    },
    {
      name: 'Integration & Testing',
      description: 'End-to-end testing, API tests, deployment configuration, documentation',
      estimated_days: Math.max(1, Math.floor(timelineDays * 0.15)),
      priority: 'P1',
      dependencies: ['Frontend Application', 'Authentication & Security'],
    },
  ]

  const totalDays = modules.reduce((sum, m) => sum + m.estimated_days, 0)

  return {
    project_summary: `${name}: ${description}. MVP scope targeting ${timelineDays}-day delivery at ₹${budget.toLocaleString('en-IN')} (~₹${Math.round(dailyRate).toLocaleString('en-IN')}/day). Stack: React + Node.js + MongoDB.`,
    modules,
    total_estimated_days: totalDays,
    risk_level: totalDays > timelineDays ? 'high' : totalDays === timelineDays ? 'medium' : 'low',
    confidence_score: totalDays <= timelineDays ? 75 : 55,
    questions: [
      'Are there specific third-party integrations required?',
      'What is the expected concurrent user load?',
      'Are there compliance requirements (GDPR, HIPAA, SOC2)?',
      'Is mobile support required in v1?',
    ],
    reasoning: `Decomposed "${name}" into ${modules.length} modules totaling ${totalDays} days. Daily burn rate: ₹${Math.round(dailyRate)}. Priority: ${priority}.`,
  }
}

export async function runAgent1(project) {
  const start = Date.now()
  const userPrompt = `Project Name: ${project.name}
Description: ${project.description}
Budget: ₹${project.budget}
Timeline: ${project.timelineDays} days
Priority: ${project.priority}`

  let output = await callLLM(ANALYST_PROMPT, userPrompt)
  if (!output) {
    output = ruleBasedAnalysis(project)
  }

  if (!output.reasoning) {
    output.reasoning = `Analyzed project "${project.name}" with ${output.modules?.length || 0} modules.`
  }

  return {
    output,
    durationMs: Date.now() - start,
    usedLLM: !!config.openai.apiKey,
  }
}
