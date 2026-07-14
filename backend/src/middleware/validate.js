import { ZodError, z } from 'zod'
import logger from '../utils/logger.js'

export function validate(schema) {
  return (req, res, next) => {
    try {
      req.validated = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      })
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        })
      }
      next(err)
    }
  }
}

export function errorHandler(err, _req, res, _next) {
  logger.error('Request error', { error: err.message, stack: err.stack })

  const status = err.status || 500
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export const schemas = {
  register: z.object({
    body: z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['admin', 'manager', 'user']).optional(),
    }),
  }),
  login: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }),
  }),
  createProject: z.object({
    body: z.object({
      name: z.string().min(2).max(200),
      description: z.string().min(10),
      budget: z.number().positive(),
      timelineDays: z.number().int().positive().max(365),
      priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
    }),
  }),
  approveProject: z.object({
    body: z.object({
      decision: z.enum(['approve', 'reject', 'more_info']),
      notes: z.string().optional(),
    }),
    params: z.object({
      id: z.string(),
    }),
  }),
}
