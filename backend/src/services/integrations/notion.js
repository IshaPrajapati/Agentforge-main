import { Client } from '@notionhq/client'
import { config } from '../../config/index.js'
import logger from '../../utils/logger.js'

function getClient() {
  return new Client({ auth: config.notion.token })
}

/**
 * Stage 1 — Called by Agent 1 after requirement analysis.
 * Creates a new page in the Notion database with Status: Planning.
 * Returns the notionPageId so subsequent agents can update the same page.
 */
export async function createNotionProjectPage({ name, description, budget, timelineDays, priority }) {
  if (!config.notion.token || !config.notion.databaseId) {
    logger.info('Notion not configured — simulating page creation', { name })
    return {
      created: true,
      simulated: true,
      notionPageId: `simulated-${Date.now()}`,
      pageUrl: `https://notion.so/simulated/${encodeURIComponent(name)}`,
    }
  }

  try {
    const notion = getClient()
    const response = await notion.pages.create({
      parent: { database_id: config.notion.databaseId },
      properties: {
        Name: { title: [{ text: { content: name } }] },
        Status: { select: { name: 'Planning' } },
        Budget: { number: budget },
        'Timeline (Days)': { number: timelineDays },
        Priority: { select: { name: priority || 'medium' } },
        'Approval Required': { checkbox: false },
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: [{ type: 'text', text: { content: '📋 Project Brief' } }] },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: description || 'No description provided.' } }],
          },
        },
        {
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{ type: 'text', text: { content: '⏳ Agent 1 (Requirement Analyst) is processing this project…' } }],
            icon: { emoji: '🤖' },
            color: 'blue_background',
          },
        },
      ],
    })

    logger.info('Notion page created (Stage 1)', { name, pageId: response.id })
    return {
      created: true,
      simulated: false,
      notionPageId: response.id,
      pageUrl: response.url,
    }
  } catch (err) {
    logger.error('Notion Stage 1 failed, simulating', { error: err.message })
    return {
      created: true,
      simulated: true,
      notionPageId: `simulated-${Date.now()}`,
      pageUrl: `https://notion.so/simulated/${encodeURIComponent(name)}`,
    }
  }
}

/**
 * Stage 1b — Called after Agent 1 completes.
 * Appends the full requirement analysis breakdown to the Notion page.
 */
export async function appendAgent1OutputToNotion(notionPageId, agent1Output, projectName) {
  if (!config.notion.token || notionPageId?.startsWith('simulated-')) {
    logger.info('Notion not configured — skipping Agent 1 output append', { projectName })
    return { updated: true, simulated: true }
  }

  try {
    const notion = getClient()
    const modules = agent1Output.modules || []

    await notion.blocks.children.append({
      block_id: notionPageId,
      children: [
        {
          object: 'block',
          type: 'divider',
          divider: {},
        },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: [{ type: 'text', text: { content: '🔍 Agent 1 — Requirement Analysis' } }] },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: agent1Output.project_summary || '' } }],
          },
        },
        {
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{
              type: 'text',
              text: {
                content: `Risk: ${agent1Output.risk_level?.toUpperCase() || 'N/A'} | Confidence: ${agent1Output.confidence_score || 0}% | Est. Days: ${agent1Output.total_estimated_days || 0}`,
              },
            }],
            icon: { emoji: '📊' },
            color: agent1Output.risk_level === 'high' ? 'red_background' : 'yellow_background',
          },
        },
        {
          object: 'block',
          type: 'heading_3',
          heading_3: { rich_text: [{ type: 'text', text: { content: '📦 Modules Identified' } }] },
        },
        ...modules.map((m) => ({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{
              type: 'text',
              text: {
                content: `[${m.priority}] ${m.name} — ${m.estimated_days} day(s) | Deps: ${(m.dependencies || []).join(', ') || 'None'}`,
              },
            }],
          },
        })),
        ...(agent1Output.questions?.length ? [
          {
            object: 'block',
            type: 'heading_3',
            heading_3: { rich_text: [{ type: 'text', text: { content: '❓ Open Questions' } }] },
          },
          ...agent1Output.questions.map((q) => ({
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: {
              rich_text: [{ type: 'text', text: { content: q } }],
            },
          })),
        ] : []),
      ],
    })

    logger.info('Notion Agent 1 output appended', { notionPageId })
    return { updated: true, simulated: false }
  } catch (err) {
    logger.error('Notion Agent 1 append failed', { error: err.message })
    return { updated: true, simulated: true }
  }
}

/**
 * Stage 2 — Called after Agent 2 (Engineering Manager) completes feasibility review.
 * Updates page Status and appends feasibility analysis.
 */
export async function updateNotionAfterAgent2(notionPageId, agent2Output, projectName) {
  if (!config.notion.token || notionPageId?.startsWith('simulated-')) {
    logger.info('Notion not configured — simulating Agent 2 update', { projectName })
    return { updated: true, simulated: true }
  }

  try {
    const notion = getClient()
    const newStatus = agent2Output.approval_required ? 'Awaiting Approval' : 'Under Review'

    // Update page properties
    await notion.pages.update({
      page_id: notionPageId,
      properties: {
        Status: { select: { name: newStatus } },
        'Approval Required': { checkbox: agent2Output.approval_required ?? false },
        'Risk Level': { select: { name: agent2Output.risk_analysis?.includes('high') ? 'High' : agent2Output.risk_analysis?.includes('low') ? 'Low' : 'Medium' } },
      },
    })

    // Append Agent 2 analysis blocks
    await notion.blocks.children.append({
      block_id: notionPageId,
      children: [
        {
          object: 'block',
          type: 'divider',
          divider: {},
        },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: [{ type: 'text', text: { content: '🔎 Agent 2 — Feasibility Review' } }] },
        },
        {
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{ type: 'text', text: { content: agent2Output.manager_summary || 'No summary available.' } }],
            icon: { emoji: agent2Output.approval_required ? '⚠️' : '✅' },
            color: agent2Output.approval_required ? 'orange_background' : 'green_background',
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ type: 'text', text: { content: `📦 Budget: ${agent2Output.budget_analysis || 'N/A'}` } }] },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ type: 'text', text: { content: `📅 Timeline: ${agent2Output.timeline_analysis || 'N/A'}` } }] },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ type: 'text', text: { content: `⚡ Risk: ${agent2Output.risk_analysis || 'N/A'}` } }] },
        },
        {
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{ type: 'text', text: { content: `💡 Recommendation: ${agent2Output.recommendation || 'N/A'}` } }],
            icon: { emoji: '💡' },
            color: 'blue_background',
          },
        },
        ...(agent2Output.approval_required ? [{
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{ type: 'text', text: { content: '⏸️ PAUSED — Awaiting human manager approval before execution continues.' } }],
            icon: { emoji: '👤' },
            color: 'yellow_background',
          },
        }] : []),
      ],
    })

    logger.info('Notion updated after Agent 2', { notionPageId, status: newStatus })
    return { updated: true, simulated: false }
  } catch (err) {
    logger.error('Notion Agent 2 update failed', { error: err.message })
    return { updated: true, simulated: true }
  }
}

/**
 * Stage 3 — Called after Agent 3 (Executor) completes.
 * Finalizes the Notion page with GitHub issues, Slack/Email statuses, and final status.
 */
export async function finalizeNotionProject(notionPageId, { projectName, agent1Output, agent3Output, decision }) {
  if (!config.notion.token || notionPageId?.startsWith('simulated-')) {
    logger.info('Notion not configured — simulating Agent 3 finalization', { projectName })
    return { updated: true, simulated: true, pageUrl: `https://notion.so/simulated/${encodeURIComponent(projectName)}` }
  }

  try {
    const notion = getClient()
    const integrations = agent3Output.integrations || {}
    const issues = agent3Output.issues_created || []
    const statusName = decision === 'reject' ? 'Rejected' : 'Approved & Executing'

    // Update final page properties
    await notion.pages.update({
      page_id: notionPageId,
      properties: {
        Status: { select: { name: statusName } },
        'GitHub Issues Created': { number: issues.length },
      },
    })

    if (decision === 'reject') {
      await notion.blocks.children.append({
        block_id: notionPageId,
        children: [
          { object: 'block', type: 'divider', divider: {} },
          {
            object: 'block',
            type: 'callout',
            callout: {
              rich_text: [{ type: 'text', text: { content: '❌ Project REJECTED by manager. Workflow terminated.' } }],
              icon: { emoji: '🚫' },
              color: 'red_background',
            },
          },
        ],
      })
      return { updated: true, simulated: false }
    }

    // Build integration status summary
    const integrationLines = [
      `GitHub Issues: ${integrations.github?.created ? `${issues.length} created` : 'Simulated ✓'}`,
      `Slack: ${integrations.slack?.sent ? 'Notification sent ✓' : 'Simulated ✓'}`,
      `Email: ${integrations.gmail?.sent ? 'Email sent ✓' : 'Simulated ✓'}`,
    ]

    const githubBlocks = issues.length > 0
      ? [
          {
            object: 'block',
            type: 'heading_3',
            heading_3: { rich_text: [{ type: 'text', text: { content: '🔗 GitHub Issues Created' } }] },
          },
          ...issues.map((issue) => ({
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: {
              rich_text: [{ type: 'text', text: { content: issue.title || issue } }],
            },
          })),
        ]
      : []

    await notion.blocks.children.append({
      block_id: notionPageId,
      children: [
        { object: 'block', type: 'divider', divider: {} },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: [{ type: 'text', text: { content: '🚀 Agent 3 — Execution Complete' } }] },
        },
        {
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{ type: 'text', text: { content: `✅ Project approved and executing.\n${integrationLines.join('\n')}` } }],
            icon: { emoji: '🎯' },
            color: 'green_background',
          },
        },
        ...githubBlocks,
        { object: 'block', type: 'divider', divider: {} },
        {
          object: 'block',
          type: 'heading_3',
          heading_3: { rich_text: [{ type: 'text', text: { content: '📝 Audit Log' } }] },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: agent3Output.audit_log || 'No audit log available.' } }],
          },
        },
      ],
    })

    // Get final page URL
    const page = await notion.pages.retrieve({ page_id: notionPageId })

    logger.info('Notion finalized after Agent 3', { notionPageId, issues: issues.length })
    return { updated: true, simulated: false, pageUrl: page.url }
  } catch (err) {
    logger.error('Notion Agent 3 finalization failed', { error: err.message })
    return { updated: true, simulated: true, pageUrl: `https://notion.so/simulated/${encodeURIComponent(projectName)}` }
  }
}

/**
 * Health check — Verifies Notion token and database access.
 */
export async function checkNotionStatus() {
  if (!config.notion.token) {
    return { configured: false, reason: 'NOTION_TOKEN not set in .env' }
  }

  try {
    const notion = getClient()
    const me = await notion.users.me()

    if (!config.notion.databaseId) {
      return {
        configured: false,
        tokenValid: true,
        botName: me.name,
        reason: 'NOTION_DATABASE_ID not set in .env',
      }
    }

    const db = await notion.databases.retrieve({ database_id: config.notion.databaseId })
    const props = Object.keys(db.properties)

    const requiredProps = ['Name', 'Status', 'Budget', 'Timeline (Days)', 'Priority', 'Approval Required', 'Risk Level', 'GitHub Issues Created']
    const missing = requiredProps.filter((p) => !props.includes(p))

    return {
      configured: missing.length === 0,
      tokenValid: true,
      botName: me.name,
      databaseTitle: db.title?.[0]?.plain_text || 'Untitled',
      existingColumns: props,
      missingColumns: missing,
      reason: missing.length > 0 ? `Missing columns: ${missing.join(', ')}` : null,
    }
  } catch (err) {
    return {
      configured: false,
      tokenValid: false,
      reason: err.message,
    }
  }
}
