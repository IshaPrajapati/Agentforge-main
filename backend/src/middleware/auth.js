import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { User } from '../config/jsonDatabase.js'

export function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const token = header.slice(7)
    const decoded = jwt.verify(token, config.jwt.secret)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

export async function attachUser(req, _res, next) {
  if (req.user?.id) {
    const user = await User.findById(req.user.id)
    if (user) {
      const { password, ...safe } = user
      req.dbUser = safe
    }
  }
  next()
}
