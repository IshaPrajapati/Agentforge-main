import { config } from '../../config/index.js'
import logger from '../../utils/logger.js'

export async function sendSlackNotification({ projectName, budget, timelineDays, moduleCount }) {
  const message = {
    text: `🚀 *New Project Approved: ${projectName}*`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `Project Kickoff: ${projectName}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Budget:*\n₹${budget.toLocaleString('en-IN')}` },
          { type: 'mrkdwn', text: `*Timeline:*\n${timelineDays} days` },
          { type: 'mrkdwn', text: `*Modules:*\n${moduleCount}` },
          { type: 'mrkdwn', text: `*Status:*\nAgent 3 Executed ✅` },
        ],
      },
    ],
  }

  if (!config.slack.webhookUrl) {
    logger.info('Slack not configured — simulating notification', { projectName })
    return { sent: true, simulated: true, message }
  }

  try {
    const response = await fetch(config.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    if (!response.ok) throw new Error(`Slack returned ${response.status}`)
    return { sent: true, simulated: false, message }
  } catch (err) {
    logger.error('Slack failed, simulating', { error: err.message })
    return { sent: true, simulated: true, message }
  }
}
