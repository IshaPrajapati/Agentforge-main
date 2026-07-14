import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, RefreshCw, Database, Key, Table } from 'lucide-react'
import { api } from '../api'

const REQUIRED_COLUMNS = [
  { name: 'Name',                  type: 'title',    desc: 'Auto-created default title column' },
  { name: 'Status',                type: 'select',   desc: 'Options: Planning, Under Review, Awaiting Approval, Approved & Executing, Rejected' },
  { name: 'Budget',                type: 'number',   desc: 'Number format' },
  { name: 'Timeline (Days)',       type: 'number',   desc: 'Number format' },
  { name: 'Priority',              type: 'select',   desc: 'Options: low, medium, high, critical' },
  { name: 'Risk Level',            type: 'select',   desc: 'Options: Low, Medium, High' },
  { name: 'Approval Required',     type: 'checkbox', desc: 'Checked = requires human approval' },
  { name: 'GitHub Issues Created', type: 'number',   desc: 'Count of GitHub issues created by Agent 3' },
]

const TYPE_COLORS = {
  title:    'bg-purple-500/20 text-purple-300',
  select:   'bg-blue-500/20 text-blue-300',
  number:   'bg-emerald-500/20 text-emerald-300',
  checkbox: 'bg-amber-500/20 text-amber-300',
}

function StepCard({ number, title, children, done }) {
  return (
    <div className={`rounded-xl border p-5 transition-colors ${done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-gray-700 bg-gray-800/50'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${done ? 'bg-emerald-600' : 'bg-gray-700'}`}>
          {done ? <CheckCircle className="w-4 h-4 text-white" /> : number}
        </div>
        <h3 className="font-semibold text-base">{title}</h3>
      </div>
      <div className="ml-11 text-sm text-gray-300 space-y-2">{children}</div>
    </div>
  )
}

function StatusBadge({ ok, text }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {text}
    </span>
  )
}

export default function NotionSetup() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function checkStatus() {
    setLoading(true)
    setError('')
    try {
      const data = await api.checkNotionStatus()
      setStatus(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { checkStatus() }, [])

  const hasToken = status?.tokenValid
  const hasDb = hasToken && status?.databaseTitle
  const allColumnsOk = hasDb && status?.missingColumns?.length === 0
  const fullyConfigured = status?.configured

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Notion Setup</h1>
            <p className="text-gray-400 text-sm mt-0.5">Connect AgentForge to your Notion workspace as durable memory</p>
          </div>
        </div>
      </header>

      {/* Connection Status Banner */}
      <div className={`rounded-xl p-4 mb-8 border flex items-center justify-between ${fullyConfigured ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-amber-500/40 bg-amber-500/10'}`}>
        <div className="flex items-center gap-3">
          {fullyConfigured
            ? <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            : <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />}
          <div>
            {fullyConfigured ? (
              <>
                <p className="font-semibold text-emerald-300">Notion is fully configured!</p>
                <p className="text-sm text-emerald-400/80">
                  Connected as <strong>{status?.botName}</strong> → database <strong>"{status?.databaseTitle}"</strong>
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-amber-300">Notion is not fully configured</p>
                <p className="text-sm text-amber-400/80">{status?.reason || 'Follow the steps below to connect.'}</p>
              </>
            )}
          </div>
        </div>
        <button
          id="notion-refresh-btn"
          onClick={checkStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-medium text-gray-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking…' : 'Re-check'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Step-by-step guide */}
      <div className="space-y-4 mb-10">
        <h2 className="text-lg font-semibold mb-4">Setup Guide</h2>

        <StepCard number="1" title="Create a Notion Integration" done={hasToken}>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>Go to <a href="https://www.notion.so/profile/integrations" target="_blank" rel="noreferrer" className="text-brand-400 hover:underline inline-flex items-center gap-1">notion.so/profile/integrations <ExternalLink className="w-3 h-3" /></a></li>
            <li>Click <strong>"New integration"</strong> → give it a name (e.g., "AgentForge")</li>
            <li>Copy the <strong>"Internal Integration Secret"</strong> (starts with <code className="bg-gray-700 px-1 rounded text-xs">secret_</code>)</li>
            <li>Add it to your <code className="bg-gray-700 px-1 rounded text-xs">.env</code> file:</li>
          </ol>
          <pre className="mt-2 bg-gray-950 rounded-lg p-3 text-xs text-emerald-300 overflow-x-auto">NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxx</pre>
          {hasToken && (
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge ok text={`Connected as "${status?.botName}"`} />
            </div>
          )}
        </StepCard>

        <StepCard number="2" title="Create & Share a Notion Database" done={hasDb}>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>In Notion, create a new <strong>full-page database</strong> (table view)</li>
            <li>Open the database → click <strong>"…"</strong> (top right) → <strong>"Connect to"</strong></li>
            <li>Select your <strong>"AgentForge"</strong> integration</li>
            <li>Copy the <strong>database ID</strong> from the URL:<br />
              <code className="bg-gray-700 px-1 rounded text-xs mt-1 inline-block">notion.so/workspace/<span className="text-amber-300">[DATABASE_ID]</span>?v=…</code>
            </li>
            <li>Add to <code className="bg-gray-700 px-1 rounded text-xs">.env</code>:</li>
          </ol>
          <pre className="mt-2 bg-gray-950 rounded-lg p-3 text-xs text-emerald-300 overflow-x-auto">NOTION_DATABASE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</pre>
          {hasDb && (
            <StatusBadge ok text={`Database: "${status?.databaseTitle}"`} />
          )}
        </StepCard>

        <StepCard number="3" title="Add Required Database Columns" done={allColumnsOk}>
          <p className="text-gray-400 mb-3">
            Add each column to your Notion database. In the table view click <strong>"+"</strong> → set Name and Type exactly as shown below.
          </p>
          <div className="space-y-2">
            {REQUIRED_COLUMNS.map((col) => {
              const isMissing = status?.missingColumns?.includes(col.name)
              const isChecked = hasDb && !isMissing
              return (
                <div key={col.name} className={`flex items-start gap-3 p-3 rounded-lg border ${isChecked ? 'border-emerald-500/20 bg-emerald-500/5' : isMissing ? 'border-red-500/30 bg-red-500/5' : 'border-gray-700 bg-gray-800/30'}`}>
                  <div className="mt-0.5">
                    {isChecked
                      ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                      : isMissing
                        ? <XCircle className="w-4 h-4 text-red-400" />
                        : <div className="w-4 h-4 rounded-full border border-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium">{col.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLORS[col.type] || 'bg-gray-600 text-gray-300'}`}>{col.type}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{col.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
          {allColumnsOk && (
            <div className="mt-3">
              <StatusBadge ok text="All columns verified ✓" />
            </div>
          )}
        </StepCard>

        <StepCard number="4" title="Run the Verification Script" done={fullyConfigured}>
          <p className="text-gray-400">Run this in your backend directory to verify everything is working:</p>
          <pre className="mt-2 bg-gray-950 rounded-lg p-3 text-xs text-cyan-300 overflow-x-auto">node src/scripts/setupNotion.js</pre>
          <p className="text-gray-500 text-xs mt-2">
            The script will verify your token, list accessible databases, check all required columns, and print instructions if anything is missing.
          </p>
          {fullyConfigured && <StatusBadge ok text="Fully configured and ready" />}
        </StepCard>
      </div>

      {/* What gets written to Notion */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Table className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold">What AgentForge writes to Notion</h2>
        </div>
        <div className="space-y-3">
          {[
            { stage: 'Agent 1', color: 'bg-blue-600', label: 'Requirement Analysis', desc: 'Creates a new page with project brief, all modules, risk level, and open questions. Status set to "Planning".' },
            { stage: 'Agent 2', color: 'bg-purple-600', label: 'Feasibility Review', desc: 'Updates the same page with budget analysis, timeline review, risk breakdown, and manager recommendation. Status → "Under Review" or "Awaiting Approval".' },
            { stage: 'Human', color: 'bg-amber-600', label: 'Approval Gate', desc: 'If approval is required, Notion shows a callout block indicating the workflow is paused.' },
            { stage: 'Agent 3', color: 'bg-emerald-600', label: 'Execution', desc: 'Finalizes the page with GitHub issue links, Slack/Email status, and a complete audit log. Status → "Approved & Executing".' },
          ].map(({ stage, color, label, desc }) => (
            <div key={stage} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50">
              <span className={`text-xs font-bold px-2 py-1 rounded ${color} text-white whitespace-nowrap mt-0.5`}>{stage}</span>
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
