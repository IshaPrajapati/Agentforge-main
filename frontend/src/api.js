const API = '/api'

function getToken() {
  return localStorage.getItem('token')
}

function setAuth(token, user) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

function getUser() {
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (res.status === 401) {
    clearAuth()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) throw new Error(data.error || data.message || 'Request failed')
  return data
}

export const api = {
  login: async (email, password) => {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    setAuth(data.token, data.user)
    return data
  },
  register: async (payload) => {
    const data = await request('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
    setAuth(data.token, data.user)
    return data
  },
  logout: () => clearAuth(),
  getUser,
  getDashboard: () => request('/projects/dashboard'),
  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  getTimeline: (id) => request(`/projects/${id}/timeline`),
  createProject: (payload) => request('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  approveProject: (id, decision, notes) =>
    request(`/projects/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
    }),
  simulateScenario: (id, payload) =>
    request(`/projects/${id}/simulate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  checkNotionStatus: () => request('/notion/status'),
}
