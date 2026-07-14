import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { api } from './api'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProjectList from './pages/ProjectList'
import ProjectCreate from './pages/ProjectCreate'
import ProjectDetail from './pages/ProjectDetail'
import Approvals from './pages/Approvals'
import NotionSetup from './pages/NotionSetup'

function PrivateRoute({ children }) {
  return api.getUser() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<ProjectList />} />
          <Route path="projects/new" element={<ProjectCreate />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="notion-setup" element={<NotionSetup />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
