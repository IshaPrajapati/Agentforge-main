import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { api } from '../api'
import { statusColors } from '../components/Layout'

function StatCard({ icon: Icon, label, value, gradient, to }) {
  return (
    <Link to={to} className="glass-card flex items-center gap-5 hover-glow group transition-all duration-300 transform hover:-translate-y-1">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-300 shrink-0`}>
        <Icon className="w-7 h-7 text-white drop-shadow-md" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">{value}</p>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getDashboard().then(setStats).catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="text-red-400">{error}</div>
  if (!stats) return <div className="text-gray-400">Loading dashboard...</div>

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1">AI Multi-Agent project orchestration overview</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={FolderKanban} label="Total Projects" value={stats.total} gradient="from-brand-500 to-indigo-600" to="/projects" />
        <StatCard icon={Clock} label="Awaiting Approval" value={stats.awaiting} gradient="from-amber-400 to-orange-600" to="/approvals" />
        <StatCard icon={CheckCircle} label="Completed" value={stats.completed} gradient="from-emerald-400 to-teal-600" to="/projects?status=completed" />
        <StatCard icon={XCircle} label="Failed / Rejected" value={stats.rejected + stats.failed} gradient="from-red-400 to-rose-600" to="/projects?status=failed,rejected" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card flex flex-col justify-center">
          <h2 className="text-xl font-bold mb-8 text-white tracking-wide">Orchestration Health</h2>
          <div className="space-y-8">
            <div>
              <div className="flex justify-between text-sm font-medium mb-3">
                <span className="text-gray-400 uppercase tracking-wider text-xs">Success Rate</span>
                <span className="text-emerald-400">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                  style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-medium mb-3">
                <span className="text-gray-400 uppercase tracking-wider text-xs">Pending Actions</span>
                <span className="text-amber-400">
                  {stats.total > 0 ? Math.round((stats.awaiting / stats.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                  style={{ width: `${stats.total > 0 ? (stats.awaiting / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="glass-card bg-gradient-to-br from-brand-900/40 to-purple-900/40 border-brand-500/30">
          <h2 className="text-xl font-bold mb-2 text-white tracking-wide">System Activity</h2>
          <p className="text-sm text-brand-200/80 mb-6 font-medium">AI Agents are actively monitoring and orchestrating your workflows.</p>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <span className="text-sm font-medium text-gray-200">Agent 1 (Analyst) is online</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)] delay-75"></div>
              <span className="text-sm font-medium text-gray-200">Agent 2 (Manager) is online</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)] delay-150"></div>
              <span className="text-sm font-medium text-gray-200">Agent 3 (Execution) is online</span>
            </div>
          </div>
        </div>
      </div>

      {stats.awaiting > 0 && (
        <div className="mt-6 glass-card border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 animate-pulse" />
            <p className="text-amber-200">
              <span className="font-semibold text-amber-100">{stats.awaiting}</span> project{stats.awaiting > 1 ? 's' : ''} awaiting your approval.{' '}
              <Link to="/approvals" className="underline font-medium hover:text-amber-100 transition-colors">Review now</Link>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
