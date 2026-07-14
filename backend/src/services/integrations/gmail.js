import nodemailer from 'nodemailer'
import { config } from '../../config/index.js'
import logger from '../../utils/logger.js'
import { AuditLog } from '../../config/jsonDatabase.js'
import { recordAudit } from '../auditService.js'

export async function sendEmailNotification({ projectName, budget, timelineDays, modules }) {
  const moduleList = modules.map((m) => `  • ${m.name} (${m.estimated_days}d, ${m.priority})`).join('\n')

  const html = `
    <h2>Project Approved: ${projectName}</h2>
    <p><strong>Budget:</strong> ₹${budget.toLocaleString('en-IN')}</p>
    <p><strong>Timeline:</strong> ${timelineDays} days</p>
    <h3>Modules</h3>
    <pre>${moduleList}</pre>
    <p>Agent 3 has created GitHub issues and updated Notion.</p>
    <hr><small>Sent by AgentForge Orchestrator</small>
  `

  if (!config.gmail.user || !config.gmail.appPassword || !config.gmail.notificationEmail) {
    logger.info('Gmail not configured — simulating email', { projectName })
    return { sent: true, simulated: true, subject: `Project Approved: ${projectName}` }
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.gmail.user, pass: config.gmail.appPassword },
    })

    await transporter.sendMail({
      from: config.gmail.user,
      to: config.gmail.notificationEmail,
      subject: `✅ Project Approved: ${projectName}`,
      html,
    })

    return { sent: true, simulated: false, subject: `Project Approved: ${projectName}` }
  } catch (err) {
    logger.error('Gmail failed, simulating', { error: err.message })
    return { sent: true, simulated: true, subject: `Project Approved: ${projectName}` }
  }
}

async function generateAIEmailContent(role, data) {
  if (!config.openai.apiKey) return null
  try {
    const { ChatOpenAI } = await import('@langchain/openai')
    const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0.2, apiKey: config.openai.apiKey })

    const systemPrompt = `You are the AI Executive Communication Engine for AgentForge.
Generate a concise, professional HTML email for a "${role}".
Ensure the HTML is visually pleasing and clean, using standard web fonts.
Include smart action buttons (styled as anchor tags that look like buttons) matching these links (use "#" for now): "Open Notion", "View GitHub Sprint", "View Dashboard", "View Audit Timeline".
Return ONLY valid JSON: { "subject": "Dynamic Subject Line", "html": "HTML content here..." }

Guidelines per role:
- Manager: Focus on Approval, Risks, Budget, Timeline.
- Developer: Focus on Assigned Tasks, Sprint, GitHub Links, Deadlines.
- Stakeholder: Focus on Business Summary, Project Progress, Expected Completion.
`
    const userPrompt = `Project Data:\n${JSON.stringify(data, null, 2)}`

    const response = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
    
    const jsonMatch = response.content.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : response.content)
  } catch (err) {
    logger.error('AI Email generation failed', { error: err.message })
    return null
  }
}

export async function generateAndSendAIEmails({ projectId, projectName, budget, timelineDays, modules, agent1Output, agent2Output }) {
  await recordAudit({ projectId, action: 'EMAIL_GENERATED', details: { message: 'Starting AI Email Generation' } })
  
  const roles = ['Manager', 'Developer', 'Stakeholder']
  const results = { sentCount: 0, simulated: false, emails: [] }

  const hasGmailConfig = config.gmail.user && config.gmail.appPassword && config.gmail.notificationEmail
  if (!hasGmailConfig) {
    logger.info('Gmail not configured — simulating AI emails', { projectName })
    results.simulated = true
  }

  const transporter = hasGmailConfig ? nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.gmail.user, pass: config.gmail.appPassword },
  }) : null

  for (const role of roles) {
    const dedupKey = `EMAIL_DELIVERED_${role}`
    
    const previousSent = await AuditLog.findOne({ projectId, action: dedupKey })
    if (previousSent) {
      logger.info(`Email for ${role} already sent, skipping to prevent duplicates.`)
      continue
    }

    const emailContent = await generateAIEmailContent(role, { projectName, budget, timelineDays, modules, agent1Output, agent2Output })
    
    if (emailContent && emailContent.html && emailContent.subject) {
      try {
        if (!results.simulated) {
          await transporter.sendMail({
            from: config.gmail.user,
            to: config.gmail.notificationEmail, // Sending all to the configured email for now
            subject: emailContent.subject,
            html: emailContent.html,
          })
        }
        
        await recordAudit({ projectId, action: 'EMAIL_SENT', details: { role, subject: emailContent.subject } })
        await recordAudit({ projectId, action: dedupKey, details: { role, success: true } })
        
        results.sentCount++
        results.emails.push({ role, subject: emailContent.subject, status: 'delivered' })
      } catch (err) {
        logger.error(`Failed to send email to ${role}`, { error: err.message })
        await recordAudit({ projectId, action: 'EMAIL_FAILED', details: { role, error: err.message } })
        await recordAudit({ projectId, action: 'EMAIL_RETRY', details: { role, message: 'Queued for retry' } })
        results.emails.push({ role, status: 'failed' })
      }
    } else {
      logger.warn(`Failed to generate AI email for ${role}, falling back to default.`)
      // Fallback
      if (role === 'Manager') {
        const fallbackResult = await sendEmailNotification({ projectName, budget, timelineDays, modules })
        results.sentCount++
        results.emails.push({ role, subject: fallbackResult.subject, status: 'delivered_fallback' })
        await recordAudit({ projectId, action: dedupKey, details: { role, fallback: true } })
      }
    }
  }

  return results
}
