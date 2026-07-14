import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot } from 'lucide-react'
import { api } from '../api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('manager@agentforge.dev')
  const [password, setPassword] = useState('manager123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-400 to-purple-600 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <Bot className="w-7 h-7 text-white drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">AgentForge</h1>
            <p className="text-sm text-brand-400 font-medium">AI Orchestrator</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg text-xs text-gray-400 space-y-1">
          <p className="font-medium text-gray-300 mb-2">Demo accounts:</p>
          <p>Manager: manager@agentforge.dev / manager123</p>
          <p>Admin: admin@agentforge.dev / admin123</p>
          <p>User: user@agentforge.dev / user123</p>
        </div>
      </div>
    </div>
  )
}
