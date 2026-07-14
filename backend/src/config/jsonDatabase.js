import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../../data')
const DB_FILE = path.join(DATA_DIR, 'store.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function loadStore() {
  ensureDataDir()
  if (!fs.existsSync(DB_FILE)) {
    return { users: [], projects: [], agentHistory: [], auditLogs: [] }
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
}

function saveStore(store) {
  ensureDataDir()
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2))
}

class Collection {
  constructor(name) {
    this.name = name
  }

  _all() {
    return loadStore()[this.name] || []
  }

  _save(items) {
    const store = loadStore()
    store[this.name] = items
    saveStore(store)
  }

  async find(filter = {}) {
    let items = this._all()
    for (const [key, val] of Object.entries(filter)) {
      if (val && typeof val === 'object' && val.$in) {
        items = items.filter((item) => val.$in.map(String).includes(String(item[key])))
      } else {
        items = items.filter((item) => String(item[key]) === String(val))
      }
    }
    return items.map((item) => this._hydrate(item))
  }

  findOne(filter) {
    const items = this._all()
    const found = items.find((item) => {
      for (const [key, val] of Object.entries(filter)) {
        if (String(item[key]) !== String(val)) return false
      }
      return true
    })
    return found ? this._hydrate(found) : null
  }

  async findById(id) {
    const item = this._all().find((i) => i._id === String(id))
    return item ? this._hydrate(item) : null
  }

  async countDocuments(filter = {}) {
    const items = await this.find(filter)
    return items.length
  }

  async create(data) {
    const items = this._all()
    const doc = {
      ...data,
      _id: uuidv4().replace(/-/g, '').slice(0, 24),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    items.push(doc)
    this._save(items)
    return this._hydrate(doc)
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const items = this._all()
    const idx = items.findIndex((i) => i._id === String(id))
    if (idx === -1) return null

    if (update.$set) {
      items[idx] = { ...items[idx], ...update.$set, updatedAt: new Date().toISOString() }
    } else {
      items[idx] = { ...items[idx], ...update, updatedAt: new Date().toISOString() }
    }

    this._save(items)
    return this._hydrate(items[idx])
  }

  async findOneAndUpdate(filter, update) {
    const item = this.findOne(filter)
    if (!item) return null
    return this.findByIdAndUpdate(item._id, update)
  }

  async deleteOne(filter) {
    const item = this.findOne(filter)
    if (!item) return { deletedCount: 0 }
    const items = this._all().filter((i) => i._id !== item._id)
    this._save(items)
    return { deletedCount: 1 }
  }

  async deleteMany(filter) {
    let items = this._all()
    const initialLength = items.length
    items = items.filter((item) => {
      for (const [key, val] of Object.entries(filter)) {
        if (String(item[key]) === String(val)) return false
      }
      return true
    })
    this._save(items)
    return { deletedCount: initialLength - items.length }
  }

  sort(items, spec) {
    const key = Object.keys(spec)[0]
    const dir = spec[key]
    return [...items].sort((a, b) => {
      const av = a[key], bv = b[key]
      if (av < bv) return dir === -1 ? 1 : -1
      if (av > bv) return dir === -1 ? -1 : 1
      return 0
    })
  }

  async findSorted(filter, sortSpec, limit) {
    let items = await this.find(filter)
    items = this.sort(items, sortSpec)
    if (limit) items = items.slice(0, limit)
    return items
  }

  select(items, fields) {
    if (!fields) return items
    const exclude = fields.startsWith('-')
    const field = exclude ? fields.slice(1) : fields
    if (exclude) {
      return items.map(({ [field]: _, ...rest }) => rest)
    }
    return items
  }

  populate(items, spec) {
    const [field, refField] = spec.split('.').length === 2 ? spec.split('.') : [spec, 'name']
    const users = loadStore().users || []

    const populateOne = (item) => {
      if (!item[field]) return item
      const ref = users.find((u) => u._id === (item[field]._id || item[field]))
      if (ref) {
        return { ...item, [field]: { _id: ref._id, name: ref.name, email: ref.email, [refField]: ref[refField] } }
      }
      return item
    }

    return Array.isArray(items) ? items.map(populateOne) : populateOne(items)
  }

  _hydrate(item) {
    const doc = { ...item }
    doc.save = async () => {
      await Collection.prototype.findByIdAndUpdate.call(this, doc._id, doc)
      return doc
    }
    doc.toObject = () => ({ ...item })
    return doc
  }
}

export const User = new Collection('users')
export const Project = new Collection('projects')
export const AgentHistory = new Collection('agentHistory')
export const AuditLog = new Collection('auditLogs')

export async function connectDatabase() {
  ensureDataDir()
  return true
}

export async function disconnectDatabase() {
  return true
}
