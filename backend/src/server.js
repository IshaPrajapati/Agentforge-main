import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { connectDatabase } from './config/jsonDatabase.js'
import { errorHandler } from './middleware/validate.js'
import authRoutes from './routes/auth.js'
import projectRoutes from './routes/projects.js'
import notionRoutes from './routes/notion.js'
import logger from './utils/logger.js'
import { config } from './config/index.js'
import { User } from './config/jsonDatabase.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'], credentials: true }))
app.use(morgan('dev'))
app.use(express.json())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'agentforge-api', version: '1.0.0' })
})

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/notion', notionRoutes)

app.use(errorHandler)

async function seedUsers() {
  const users = [
    { name: 'Admin User', email: 'admin@agentforge.dev', password: 'admin123', role: 'admin' },
    { name: 'Engineering Manager', email: 'manager@agentforge.dev', password: 'manager123', role: 'manager' },
    { name: 'Demo User', email: 'user@agentforge.dev', password: 'user123', role: 'user' },
  ]

  for (const u of users) {
    const exists = await User.findOne({ email: u.email })
    if (!exists) {
      const hashed = await bcrypt.hash(u.password, 12)
      await User.create({ ...u, password: hashed })
      logger.info(`Seeded user: ${u.email}`)
    }
  }
}

let isInitialized = false
async function initialize() {
  if (!isInitialized) {
    await connectDatabase()
    await seedUsers()
    isInitialized = true
  }
}

// Add initialization middleware for Vercel / Serverless env
app.use(async (req, res, next) => {
  try {
    await initialize()
    next()
  } catch (err) {
    next(err)
  }
})

if (!process.env.VERCEL) {
  initialize().then(() => {
    app.listen(config.port, () => {
      logger.info(`AgentForge API running on http://localhost:${config.port}`)
    })
  }).catch((err) => {
    logger.error('Failed to start server', { error: err.message })
    process.exit(1)
  })
}

export default app
