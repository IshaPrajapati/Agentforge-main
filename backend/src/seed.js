import bcrypt from 'bcryptjs'
import { connectDatabase } from './config/database.js'
import { User } from './models/index.js'
import logger from './utils/logger.js'

async function seed() {
  await connectDatabase()

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

  logger.info('Seed complete')
  process.exit(0)
}

seed().catch((err) => {
  logger.error('Seed failed', { error: err.message })
  process.exit(1)
})
