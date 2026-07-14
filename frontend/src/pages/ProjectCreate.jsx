import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function ProjectCreate() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    description: '',
    budget: '',
    timelineDays: '',
    priority: 'P1',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const project = await api.createProject({
        ...form,
        budget: Number(form.budget),
        timelineDays: Number(form.timelineDays),
      })
      navigate(`/projects/${project._id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Submit New Project</h1>
        <p className="text-gray-400 mt-1">Agent 1 will analyze requirements, Agent 2 will validate feasibility</p>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Project Name</label>
          <input className="input" placeholder="e.g. Inventory System" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea className="input h-28" placeholder="e.g. Web-based inventory management with product tracking..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Budget (₹)</label>
            <input className="input" type="number" placeholder="e.g. 80000" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Timeline (days)</label>
            <input className="input" type="number" placeholder="e.g. 15" value={form.timelineDays} onChange={(e) => setForm({ ...form, timelineDays: e.target.value })} required />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Priority</label>
          <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="P0">P0 — Critical</option>
            <option value="P1">P1 — High</option>
            <option value="P2">P2 — Medium</option>
            <option value="P3">P3 — Low</option>
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Submitting to Agent Pipeline...' : 'Submit Project'}
        </button>
      </form>
    </div>
  )
}
