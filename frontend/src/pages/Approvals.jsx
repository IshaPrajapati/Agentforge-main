import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import { api } from '../api'

export default function Approvals() {
  const [projects, setProjects] = useState([])
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Simulation State
  const [showScenarioPlanner, setShowScenarioPlanner] = useState(false)
  const [simData, setSimData] = useState({ budget: '', timelineDays: '', priority: '' })
  const [simulationResult, setSimulationResult] = useState(null)
  const [simulating, setSimulating] = useState(false)

  const load = async () => {
    const all = await api.getProjects()
    const pending = all.filter((p) => p.status === 'awaiting_approval')
    setProjects(pending)
    setProjects(pending)
    if (pending.length && !selected) handleSelect(pending[0])
  }

  const handleSelect = (project) => {
    setSelected(project)
    setShowScenarioPlanner(false)
    setSimulationResult(null)
    setSimData({
      budget: project.budget,
      timelineDays: project.timelineDays,
      priority: project.priority
    })
  }

  useEffect(() => { load().catch((e) => setError(e.message)) }, [])

  const handleDecision = async (decision) => {
    if (!selected) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await api.approveProject(selected._id, decision, notes)
      setSuccess(`Project ${decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'sent back for more info'}`)
      setSelected(null)
      setNotes('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const runSimulation = async () => {
    if (!selected) return
    setSimulating(true)
    setError('')
    try {
      const result = await api.simulateScenario(selected._id, {
        budget: Number(simData.budget),
        timelineDays: Number(simData.timelineDays),
        priority: simData.priority
      })
      setSimulationResult(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setSimulating(false)
    }
  }

  const user = api.getUser()
  if (user?.role === 'user') {
    return <div className="text-amber-400">Only managers and admins can approve projects.</div>
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Approval Queue</h1>
        <p className="text-gray-400 mt-1">Review Agent 2 recommendations and approve or reject projects</p>
      </header>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg mb-4">{success}</div>}

      {projects.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-400">No projects awaiting approval</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {projects.map((p) => (
              <button
                key={p._id}
                onClick={() => handleSelect(p)}
                className={`card w-full text-left transition-colors ${
                  selected?._id === p._id ? 'border-brand-500' : 'hover:border-gray-700'
                }`}
              >
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-gray-400">₹{p.budget?.toLocaleString('en-IN')} · {p.timelineDays} days</p>
              </button>
            ))}
          </div>

          {selected && (
            <div className="lg:col-span-2 space-y-6">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <h2 className="text-xl font-semibold">{selected.name}</h2>
                  </div>
                  <button 
                    onClick={() => setShowScenarioPlanner(!showScenarioPlanner)} 
                    className="btn-secondary text-[10px]"
                  >
                    {showScenarioPlanner ? 'Close Scenario Planner' : 'Open Scenario Planner'}
                  </button>
                </div>

                {showScenarioPlanner && (
                  <div className="p-4 bg-gray-900 border border-gray-700 rounded-none mb-6">
                    <h3 className="font-medium mb-3">Interactive AI Scenario Planner</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Budget (₹)</label>
                        <input className="input py-2 text-sm" type="number" value={simData.budget} onChange={(e) => setSimData({ ...simData, budget: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Timeline (days)</label>
                        <input className="input py-2 text-sm" type="number" value={simData.timelineDays} onChange={(e) => setSimData({ ...simData, timelineDays: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Priority</label>
                        <select className="input py-2 text-sm" value={simData.priority} onChange={(e) => setSimData({ ...simData, priority: e.target.value })}>
                          <option value="P0">P0</option>
                          <option value="P1">P1</option>
                          <option value="P2">P2</option>
                          <option value="P3">P3</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={runSimulation} className="btn-primary w-full" disabled={simulating}>
                      {simulating ? 'Running AI Simulation...' : 'Run Simulation'}
                    </button>
                  </div>
                )}

                {simulationResult && (
                  <div className="mb-6 space-y-4">
                    <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-none">
                      <h3 className="text-blue-300 font-semibold mb-2">Simulation Impact Analysis</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-blue-400 font-mono text-[10px] uppercase">What Changed</span>
                          <p className="text-gray-200 mt-1">{simulationResult.comparison.what_changed}</p>
                        </div>
                        <div>
                          <span className="text-blue-400 font-mono text-[10px] uppercase">Why it Changed</span>
                          <p className="text-gray-200 mt-1">{simulationResult.comparison.why_it_changed}</p>
                        </div>
                        <div>
                          <span className="text-blue-400 font-mono text-[10px] uppercase">Expected Impact</span>
                          <p className="text-gray-200 mt-1">{simulationResult.comparison.expected_impact}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#141414] border border-[#1a1a1a]">
                        <h4 className="text-gray-400 text-xs font-mono uppercase mb-3">Original Plan</h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-500">Timeline:</span> {selected.agent1Output?.total_estimated_days} days</p>
                          <p><span className="text-gray-500">Risk:</span> {selected.agent1Output?.risk_level}</p>
                          <p><span className="text-gray-500">Confidence:</span> {selected.agent2Output?.confidence}%</p>
                          <p className="mt-2 text-amber-200">{selected.agent2Output?.recommendation}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-[#1a1c1a] border border-emerald-900/50">
                        <h4 className="text-emerald-400 text-xs font-mono uppercase mb-3">Updated Plan</h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-500">Timeline:</span> {simulationResult.simulatedAgent1Output?.total_estimated_days} days</p>
                          <p><span className="text-gray-500">Risk:</span> {simulationResult.simulatedAgent1Output?.risk_level}</p>
                          <p><span className="text-gray-500">Confidence:</span> {simulationResult.simulatedAgent2Output?.confidence}%</p>
                          <p className="mt-2 text-emerald-200">{simulationResult.simulatedAgent2Output?.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selected.agent2Output && !simulationResult && (
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-[#141414] border border-[#1a1a1a] rounded-none">
                      <p className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">Recommendation</p>
                      <p className="font-medium text-amber-200">{selected.agent2Output.recommendation}</p>
                    </div>
                    
                    {selected.moderatorOutput && (
                      <div className="p-5 border border-purple-500/30 bg-purple-500/5 rounded-none space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-purple-400" />
                          <h3 className="font-semibold text-purple-300">AI Debate Engine Summary</h3>
                        </div>
                        <p className="text-sm text-gray-300">Agent 1 and Agent 2 disagreed on this project's feasibility. The AI Moderator reviewed both sides:</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest mb-1">Pros / Arguments For</p>
                            <ul className="list-disc pl-4 space-y-1 text-gray-400">
                              {selected.moderatorOutput.pros?.map((pro, i) => <li key={i}>{pro}</li>)}
                            </ul>
                          </div>
                          <div>
                            <p className="font-mono text-[10px] text-red-400 uppercase tracking-widest mb-1">Cons / Risks</p>
                            <ul className="list-disc pl-4 space-y-1 text-gray-400">
                              {selected.moderatorOutput.cons?.map((con, i) => <li key={i}>{con}</li>)}
                            </ul>
                          </div>
                        </div>
                        
                        <div className="pt-3 border-t border-purple-500/20">
                          <p className="font-mono text-[10px] text-purple-400 uppercase tracking-widest mb-1">Moderator Recommendation (Confidence: {selected.moderatorOutput.confidence}%)</p>
                          <p className="text-sm font-medium">{selected.moderatorOutput.best_recommendation}</p>
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-[#141414] border border-[#1a1a1a] rounded-none">
                      <p className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">Manager Summary</p>
                      <p className="text-sm">{selected.agent2Output.manager_summary}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="p-3 bg-[#141414] border border-[#1a1a1a] rounded-none">
                        <p className="text-gray-400 mb-1">Budget</p>
                        <p>{selected.agent2Output.budget_analysis}</p>
                      </div>
                      <div className="p-3 bg-[#141414] border border-[#1a1a1a] rounded-none">
                        <p className="text-gray-400 mb-1">Timeline</p>
                        <p>{selected.agent2Output.timeline_analysis}</p>
                      </div>
                      <div className="p-3 bg-[#141414] border border-[#1a1a1a] rounded-none">
                        <p className="text-gray-400 mb-1">Risk</p>
                        <p>{selected.agent2Output.risk_analysis}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-1">Approval Notes (optional)</label>
                  <textarea
                    className="input h-20"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reason for decision..."
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => handleDecision('approve')} className="btn-success flex items-center gap-2" disabled={loading}>
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => handleDecision('reject')} className="btn-danger flex items-center gap-2" disabled={loading}>
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  <button onClick={() => handleDecision('more_info')} className="btn-secondary flex items-center gap-2" disabled={loading}>
                    <HelpCircle className="w-4 h-4" /> More Info
                  </button>
                </div>
              </div>

              <Link to={`/projects/${selected._id}`} className="text-brand-400 text-sm hover:underline">
                View full project details →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
