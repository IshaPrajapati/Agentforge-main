import { Router } from 'express'
import { authenticate, requireRole, attachUser } from '../middleware/auth.js'
import { validate, schemas } from '../middleware/validate.js'
import {
  createProject,
  approveProject,
  getProjectById,
  listProjects,
  getProjectTimeline,
  getDashboardStats,
  simulateScenario,
  deleteProject,
} from '../services/projectService.js'

const router = Router()

router.use(authenticate, attachUser)

router.get('/dashboard', async (req, res, next) => {
  try {
    const filter = req.user.role === 'user' ? { submittedBy: req.user.id } : {}
    const stats = await getDashboardStats(filter)
    res.json(stats)
  } catch (err) {
    next(err)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const filter = req.user.role === 'user' ? { submittedBy: req.user.id } : {}
    const projects = await listProjects(filter)
    res.json(projects)
  } catch (err) {
    next(err)
  }
})

router.post('/', validate(schemas.createProject), async (req, res, next) => {
  try {
    const project = await createProject(req.validated.body, req.user.id)
    res.status(201).json(project)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const project = await getProjectById(req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    res.json(project)
  } catch (err) {
    next(err)
  }
})

router.get('/:id/timeline', async (req, res, next) => {
  try {
    const timeline = await getProjectTimeline(req.params.id)
    res.json(timeline)
  } catch (err) {
    next(err)
  }
})

router.post(
  '/:id/approve',
  requireRole('admin', 'manager'),
  validate(schemas.approveProject),
  async (req, res, next) => {
    try {
      const result = await approveProject(req.params.id, {
        decision: req.validated.body.decision,
        notes: req.validated.body.notes,
        userId: req.user.id,
      })
      res.json(result)
    } catch (err) {
      err.status = err.message.includes('Cannot approve') ? 400 : 500
      next(err)
    }
  }
)

router.post(
  '/:id/simulate',
  requireRole('admin', 'manager'),
  async (req, res, next) => {
    try {
      const result = await simulateScenario(req.params.id, req.body)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }
)

router.delete('/:id', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const result = await deleteProject(req.params.id)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
