import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Bot, GitBranch, MessageSquare, Mail, FileText, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react'
import { api } from '../api'
import { statusColors } from '../components/Layout'

function AgentCard({ title, agent, output, color }) {
  if (!output) return null
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-gray-400">{agent}</p>
        </div>
      </div>
      <pre className="bg-gray-950 p-4 rounded-lg text-xs overflow-x-auto text-gray-300 max-h-80">
        {JSON.stringify(output, null, 2)}
      </pre>
    </div>
  )
}

function IntegrationBadge({ name, icon: Icon, status, simulated }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${status ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-gray-700 bg-gray-800/50'}`}>
      <Icon className={`w-5 h-5 ${status ? 'text-emerald-400' : 'text-gray-500'}`} />
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-gray-400">
          {status ? (simulated ? 'Simulated ✓' : 'Connected ✓') : 'Pending'}
        </p>
      </div>
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [error, setError] = useState('')
  const user = api.getUser()
  const canDelete = user?.role === 'admin' || user?.role === 'manager'

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([api.getProject(id), api.getTimeline(id)])
      setProject(p)
      setTimeline(t)
    } catch (e) {
      setError(e.message)
    }
  }, [id])

  useEffect(() => {
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [load])

  if (error) return <div className="text-red-400">{error}</div>
  if (!project) return <div className="text-gray-400">Loading project...</div>

  const integrations = project.integrations || project.agent3Output?.integrations

  return (
    <div>
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-gray-400 mt-1">{project.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`badge text-white text-sm px-3 py-1 ${statusColors[project.status] || 'bg-gray-600'}`}>
            {project.status.replace(/_/g, ' ')}
          </span>
          {canDelete && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this project?')) {
                  api.deleteProject(id)
                    .then(() => navigate('/projects'))
                    .catch(err => alert(err.message))
                }
              }}
              className="btn bg-red-950/50 text-red-400 hover:bg-red-900 border border-red-900/50 flex items-center gap-2 rounded-lg"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-sm text-gray-400">Budget</p>
          <p className="text-xl font-bold">₹{project.budget?.toLocaleString('en-IN')}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-400">Timeline</p>
          <p className="text-xl font-bold">{project.timelineDays} days</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-400">Priority</p>
          <p className="text-xl font-bold">{project.priority}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-400">Current Step</p>
          <p className="text-sm font-medium mt-1">{project.currentStep}</p>
        </div>
      </div>

      {project.status === 'awaiting_approval' && (
        <div className="card border-amber-500/30 bg-amber-500/5 mb-8">
          <p className="text-amber-200 font-medium">This project is awaiting manager approval.</p>
          <a href="/approvals" className="text-amber-400 underline text-sm">Go to Approvals →</a>
        </div>
      )}

      <div className={`grid grid-cols-1 ${project.moderatorOutput ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6 mb-8`}>
        <AgentCard title="Requirement Analysis" agent="Agent 1" output={project.agent1Output} color="bg-blue-600" />
        <AgentCard title="Feasibility Review" agent="Agent 2" output={project.agent2Output} color="bg-purple-600" />
        {project.moderatorOutput && (
          <AgentCard title="AI Debate Summary" agent="AI Moderator" output={project.moderatorOutput} color="bg-fuchsia-600" />
        )}
      </div>

      {project.agent3Output && (
        <div className="mb-8">
          <AgentCard title="Execution Results" agent="Agent 3" output={project.agent3Output} color="bg-emerald-600" />
        </div>
      )}

      {integrations && (
        <div className="card mb-8">
          <h3 className="font-semibold mb-4">Integration Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <IntegrationBadge name="GitHub" icon={GitBranch} status={integrations.github?.created} simulated={integrations.github?.simulated} />
            <IntegrationBadge name="Slack" icon={MessageSquare} status={integrations.slack?.sent} simulated={integrations.slack?.simulated} />
            <IntegrationBadge name="Gmail" icon={Mail} status={integrations.gmail?.sent} simulated={integrations.gmail?.simulated} />
            <IntegrationBadge name="Notion" icon={FileText} status={integrations.notion?.updated} simulated={integrations.notion?.simulated} />
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold mb-4">Workflow Timeline</h3>
        <div className="space-y-4">
          {timeline.length === 0 ? (
            <p className="text-gray-400 text-sm">No events yet</p>
          ) : (
            timeline.map((event, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {event.type === 'agent' ? (
                    <Bot className="w-4 h-4 text-brand-400" />
                  ) : event.action?.includes('APPROVED') ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : event.action?.includes('REJECTED') ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {event.type === 'agent' ? `${event.agent}: ${event.action}` : event.action}
                    </p>
                    {event.durationMs && (
                      <span className="text-xs text-gray-500">{event.durationMs}ms</span>
                    )}
                  </div>
                  {event.reasoning && (
                    <p className="text-xs text-gray-400 mt-1">{event.reasoning}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
