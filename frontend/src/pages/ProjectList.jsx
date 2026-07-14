import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FolderKanban, Trash2 } from 'lucide-react'
import { api } from '../api'
import { statusColors } from '../components/Layout'

export default function ProjectList() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const user = api.getUser()
  const canDelete = user?.role === 'admin' || user?.role === 'manager'

  useEffect(() => {
    api.getProjects()
      .then(data => {
        setProjects(data)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const statusFilter = query.get('status')

  const displayedProjects = projects.filter(p => {
    if (!statusFilter) return true
    const statuses = statusFilter.split(',')
    return statuses.includes(p.status)
  })

  let title = "All Projects"
  if (statusFilter === 'completed') title = "Completed Projects"
  if (statusFilter === 'failed,rejected') title = "Failed / Rejected Projects"

  if (error) return <div className="text-red-400">{error}</div>
  if (loading) return <div className="text-gray-400">Loading projects...</div>

  return (
    <div>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-gray-400 mt-1">Browse and manage AI agent orchestration workflows</p>
        </div>
        <Link to="/projects/new" className="btn-primary">
          Create New Project
        </Link>
      </header>

      <div className="glass-card">
        {displayedProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No projects found for this filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedProjects.map((p) => (
              <Link
                key={p._id}
                to={`/projects/${p._id}`}
                className="flex items-center justify-between p-4 bg-gray-800/40 rounded-lg hover:bg-gray-800/80 transition-colors border border-gray-700/50 hover:border-brand-500/50 hover-glow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-100">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.currentStep}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xs text-gray-500 hidden md:block">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                  <span className={`badge text-white ${statusColors[p.status] || 'bg-gray-600'}`}>
                    {p.status.replace(/_/g, ' ')}
                  </span>
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (window.confirm('Are you sure you want to delete this project?')) {
                          api.deleteProject(p._id)
                            .then(() => setProjects(projects.filter(proj => proj._id !== p._id)))
                            .catch(err => alert(err.message));
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors ml-2"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
