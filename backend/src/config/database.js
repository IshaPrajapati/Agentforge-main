import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { config } from '../config/index.js'
import logger from '../utils/logger.js'

let memoryServer = null

export async function connectDatabase() {
  let uri = config.mongodbUri

  try {
    await mongoose.connect(uri)
    logger.info('Connected to MongoDB', { uri: uri.replace(/\/\/.*@/, '//***@') })
    return
  } catch (err) {
    logger.warn('MongoDB connection failed, starting in-memory server', { error: err.message })
  }

  memoryServer = await MongoMemoryServer.create()
  uri = memoryServer.getUri()
  await mongoose.connect(uri)
  logger.info('Connected to in-memory MongoDB (demo mode)')
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
  if (memoryServer) {
    await memoryServer.stop()
    memoryServer = null
  }
}
