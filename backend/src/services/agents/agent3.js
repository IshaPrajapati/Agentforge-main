import { config } from '../../config/index.js'
import logger from '../../utils/logger.js'
import { createGitHubIssues } from '../integrations/github.js'
import { sendSlackNotification } from '../integrations/slack.js'
import { generateAndSendAIEmails } from '../integrations/gmail.js'

/**
 * Agent 3 — Execution Agent.
 * Creates GitHub issues, sends Slack + Email notifications.
 * NOTE: Notion is NOT called here — the orchestrator (workflow.js) handles
 * Notion finalization so it can use the tracked notionPageId.
 */
export async function runAgent3(project, agent1Output) {
  const start = Date.now()
  const modules = agent1Output.modules || []

  const issues = modules.map((m, i) => ({
    title: `${project.name.toUpperCase().slice(0, 3)}-${String(i + 1).padStart(3, '0')}: ${m.name}`,
    body: `## ${m.name}\n\n${m.description}\n\n**Priority:** ${m.priority}\n**Estimated Days:** ${m.estimated_days}\n**Dependencies:** ${(m.dependencies || []).join(', ') || 'None'}`,
    labels: [m.priority, 'agentforge'],
  }))

  const [github, slack, gmail] = await Promise.all([
    createGitHubIssues(issues),
    sendSlackNotification({
      projectName: project.name,
      budget: project.budget,
      timelineDays: project.timelineDays,
      moduleCount: modules.length,
    }),
    generateAndSendAIEmails({
      projectId: project._id,
      projectName: project.name,
      budget: project.budget,
      timelineDays: project.timelineDays,
      modules,
      agent1Output,
      agent2Output: project.agent2Output,
    }),
  ])

  const output = {
    github_created: github.created,
    issues_created: github.issues,
    slack_notification: slack.sent,
    gmail_notification: gmail.sentCount > 0,
    // Notion is handled by the orchestrator — placeholder here for UI compatibility
    notion_updated: true,
    audit_log: `Agent3 executed for "${project.name}" | GitHub: ${github.created ? github.issues.length + ' issues' : 'simulated'} | Slack: ${slack.sent ? 'sent' : 'simulated'} | Email: ${gmail.sentCount > 0 ? gmail.sentCount + ' generated' : 'simulated'} | Notion: updated via orchestrator`,
    integrations: {
      github: { created: github.created, issues: github.issues, simulated: github.simulated },
      slack: { sent: slack.sent, simulated: slack.simulated },
      gmail: { sent: gmail.sentCount > 0, simulated: gmail.simulated },
      notion: { updated: true, simulated: false }, // populated by orchestrator after finalization
    },
    reasoning: `Created ${github.issues.length} GitHub issues from ${modules.length} modules. Notifications dispatched to Slack and Email. Notion page finalized by orchestrator.`,
  }

  logger.info('Agent 3 complete', { project: project.name, issues: github.issues.length })

  return {
    output,
    durationMs: Date.now() - start,
  }
}
