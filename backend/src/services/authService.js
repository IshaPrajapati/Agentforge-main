import bcrypt from 'bcryptjs'
import { User } from '../config/jsonDatabase.js'
import { signToken } from '../utils/jwt.js'

export async function registerUser({ name, email, password, role = 'user' }) {
  const existing = await User.findOne({ email })
  if (existing) throw new Error('Email already registered')

  const hashed = await bcrypt.hash(password, 12)
  const user = await User.create({ name, email, password: hashed, role })
  const token = signToken({ id: user._id, email: user.email, role: user.role })

  return {
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token,
  }
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email })
  if (!user) throw new Error('Invalid credentials')

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw new Error('Invalid credentials')

  const token = signToken({ id: user._id, email: user.email, role: user.role })
  return {
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token,
  }
}
