import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { checkNotionStatus } from '../services/integrations/notion.js'

const router = Router()

router.use(authenticate)

/**
 * GET /api/notion/status
 * Returns Notion connection status, database info, and missing columns.
 */
router.get('/status', async (_req, res, next) => {
  try {
    const status = await checkNotionStatus()
    res.json(status)
  } catch (err) {
    next(err)
  }
})

export default router
