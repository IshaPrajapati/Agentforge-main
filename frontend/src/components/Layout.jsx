import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bot, LayoutDashboard, PlusCircle, LogOut, ClipboardCheck, Database, FolderKanban } from 'lucide-react'
import { api } from '../api'

const statusColors = {
  submitted: 'bg-gray-500',
  agent1_running: 'bg-blue-500 animate-pulse',
  agent1_complete: 'bg-blue-600',
  agent2_running: 'bg-purple-500 animate-pulse',
  agent2_complete: 'bg-purple-600',
  awaiting_approval: 'bg-amber-500 animate-pulse',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  agent3_running: 'bg-cyan-500 animate-pulse',
  completed: 'bg-emerald-600',
  failed: 'bg-red-600',
}

export { statusColors }

export default function Layout() {
  const navigate = useNavigate()
  const user = api.getUser()

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/projects/new', icon: PlusCircle, label: 'New Project' },
    { to: '/approvals', icon: ClipboardCheck, label: 'Approvals' },
    { to: '/notion-setup', icon: Database, label: 'Notion Setup' },
  ]

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-400 to-purple-600 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <Bot className="w-6 h-6 text-white drop-shadow-md" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">AgentForge</h1>
              <p className="text-xs text-brand-400 font-medium">AI Orchestrator</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600/20 text-brand-100' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="text-sm text-gray-400 mb-2">
            <span className="text-gray-200 font-medium">{user?.name}</span>
            <span className="badge bg-brand-600/20 text-brand-100 ml-2">{user?.role}</span>
          </div>
          <button
            onClick={() => { api.logout(); navigate('/login') }}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
