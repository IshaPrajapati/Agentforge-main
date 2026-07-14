import { Router } from 'express'
import { registerUser, loginUser } from '../services/authService.js'
import { validate, schemas } from '../middleware/validate.js'

const router = Router()

router.post('/register', validate(schemas.register), async (req, res, next) => {
  try {
    const result = await registerUser(req.validated.body)
    res.status(201).json(result)
  } catch (err) {
    err.status = 400
    next(err)
  }
})

router.post('/login', validate(schemas.login), async (req, res, next) => {
  try {
    const result = await loginUser(req.validated.body)
    res.json(result)
  } catch (err) {
    err.status = 401
    next(err)
  }
})

export default router
