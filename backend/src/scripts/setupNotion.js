/**
 * AgentForge — Notion Database Setup Verification Script
 *
 * Run with: node src/scripts/setupNotion.js
 *
 * This script will:
 *  1. Verify your NOTION_TOKEN is valid
 *  2. List your accessible databases (to help find NOTION_DATABASE_ID)
 *  3. Check that all required columns exist in the target database
 *  4. Print exactly what columns to create if any are missing
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import { Client } from '@notionhq/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env') })

const NOTION_TOKEN = process.env.NOTION_TOKEN
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID

const REQUIRED_COLUMNS = [
  { name: 'Name',                   type: 'title',    note: 'Auto-created (default title column)' },
  { name: 'Status',                 type: 'select',   options: ['Planning', 'Under Review', 'Awaiting Approval', 'Approved & Executing', 'Rejected', 'Completed'] },
  { name: 'Budget',                 type: 'number',   note: 'Format: Number' },
  { name: 'Timeline (Days)',        type: 'number',   note: 'Format: Number' },
  { name: 'Priority',               type: 'select',   options: ['low', 'medium', 'high', 'critical'] },
  { name: 'Risk Level',             type: 'select',   options: ['Low', 'Medium', 'High'] },
  { name: 'Approval Required',      type: 'checkbox', note: 'Checked = human approval needed' },
  { name: 'GitHub Issues Created',  type: 'number',   note: 'Count of GitHub issues created by Agent 3' },
]

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`

function header(text) {
  console.log(`\n${c('bright', c('cyan', `━━━ ${text} ━━━`))}`)
}

function ok(text) { console.log(`  ${c('green', '✓')} ${text}`) }
function warn(text) { console.log(`  ${c('yellow', '⚠')} ${text}`) }
function fail(text) { console.log(`  ${c('red', '✗')} ${text}`) }
function info(text) { console.log(`  ${c('blue', 'ℹ')} ${text}`) }

async function run() {
  console.log(c('bright', '\n🔧 AgentForge — Notion Database Setup Check'))
  console.log('─'.repeat(50))

  // Step 1: Check token
  header('Step 1: Verifying NOTION_TOKEN')

  if (!NOTION_TOKEN) {
    fail('NOTION_TOKEN is not set in your .env file')
    info('Get your token at: https://www.notion.so/profile/integrations')
    info('1. Create a new integration')
    info('2. Copy the "Internal Integration Secret"')
    info('3. Add to .env: NOTION_TOKEN=secret_xxxxxxxx')
    process.exit(1)
  }

  const notion = new Client({ auth: NOTION_TOKEN })

  let me
  try {
    me = await notion.users.me()
    ok(`Token valid! Connected as: ${c('bright', me.name || 'Unknown Bot')} (${me.type})`)
  } catch (err) {
    fail(`Token invalid: ${err.message}`)
    info('Make sure you copied the full token including "secret_" prefix')
    process.exit(1)
  }

  // Step 2: List databases
  header('Step 2: Listing accessible databases')

  let databases = []
  try {
    const searchResult = await notion.search({
      filter: { property: 'object', value: 'database' },
    })
    databases = searchResult.results
  } catch (err) {
    warn(`Could not list databases: ${err.message}`)
    info('Make sure your integration has access to at least one database.')
    info('In Notion: open your database page → "..." menu → "Connect to" → your integration')
  }

  if (databases.length === 0) {
    warn('No databases found.')
    info('Share a database with your integration:')
    info('  1. Open the Notion page with your database')
    info('  2. Click "..." (top right) → "Connect to" → select your integration')
    info('  3. Re-run this script')
  } else {
    info(`Found ${databases.length} accessible database(s):`)
    databases.forEach((db, i) => {
      const title = db.title?.[0]?.plain_text || 'Untitled'
      const id = db.id
      const isCurrent = id === NOTION_DATABASE_ID || id.replace(/-/g, '') === NOTION_DATABASE_ID?.replace(/-/g, '')
      console.log(`     ${i + 1}. ${c('bright', title)}`)
      console.log(`        ID: ${c('cyan', id)} ${isCurrent ? c('green', '← CURRENT') : ''}`)
    })
  }

  // Step 3: Check NOTION_DATABASE_ID
  header('Step 3: Verifying NOTION_DATABASE_ID')

  if (!NOTION_DATABASE_ID) {
    warn('NOTION_DATABASE_ID is not set in your .env file')
    info('Copy the ID from one of the databases listed above')
    info('The ID is the long string in the Notion URL:')
    info('  notion.so/yourworkspace/[DATABASE-ID]?v=...')
    info('Add to .env: NOTION_DATABASE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')

    if (databases.length > 0) {
      info('\nQuick suggestion — add this to your .env:')
      const first = databases[0]
      console.log(`     ${c('yellow', `NOTION_DATABASE_ID=${first.id}`)}`)
    }
    process.exit(0)
  }

  let db
  try {
    db = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID })
    ok(`Database found: ${c('bright', db.title?.[0]?.plain_text || 'Untitled')}`)
  } catch (err) {
    fail(`Database not found: ${err.message}`)
    info('Check that NOTION_DATABASE_ID is correct and your integration has access')
    process.exit(1)
  }

  // Step 4: Check required columns
  header('Step 4: Checking required database columns')

  const existingProps = db.properties || {}
  const existingNames = Object.keys(existingProps)
  const missing = []

  for (const col of REQUIRED_COLUMNS) {
    const found = existingProps[col.name]
    if (!found) {
      missing.push(col)
      fail(`Missing: "${col.name}" (type: ${col.type})`)
    } else if (found.type !== col.type) {
      warn(`Wrong type: "${col.name}" is ${found.type}, expected ${col.type}`)
    } else {
      ok(`"${col.name}" (${col.type})`)
    }
  }

  // Final report
  header('Summary')

  if (missing.length === 0) {
    console.log(`\n  ${c('green', c('bright', '✅ All checks passed! Your Notion database is ready.'))}`)
    info('You can now run the AgentForge workflow and it will write to Notion.')
  } else {
    console.log(`\n  ${c('yellow', `⚠️  ${missing.length} column(s) missing from your database.`)}`)
    info('\nHow to add missing columns in Notion:')
    info('  1. Open your database in Notion')
    info('  2. Click "+" to add a new property (column)')
    info('  3. Set the name and type exactly as listed below:')

    console.log('\n  ' + c('bright', 'Columns to create:'))
    missing.forEach((col) => {
      console.log(`\n    ${c('yellow', `Column: "${col.name}"`)}`)
      console.log(`      Type: ${c('cyan', col.type)}`)
      if (col.options) {
        console.log(`      Options: ${col.options.map((o) => `"${o}"`).join(', ')}`)
      }
      if (col.note) {
        console.log(`      Note: ${col.note}`)
      }
    })

    console.log('\n  After adding all columns, re-run this script to verify.\n')
  }
}

run().catch((err) => {
  console.error(c('red', `\nUnexpected error: ${err.message}`))
  process.exit(1)
})
