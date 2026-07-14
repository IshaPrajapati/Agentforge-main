import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'user'], default: 'user' },
  },
  { timestamps: true }
)

userSchema.index({ email: 1 })

export const User = mongoose.model('User', userSchema)

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    budget: { type: Number, required: true },
    budgetCurrency: { type: String, default: 'INR' },
    timelineDays: { type: Number, required: true },
    priority: { type: String, enum: ['P0', 'P1', 'P2', 'P3'], default: 'P1' },
    status: {
      type: String,
      enum: [
        'submitted',
        'agent1_running',
        'agent1_complete',
        'agent2_running',
        'agent2_complete',
        'awaiting_approval',
        'approved',
        'rejected',
        'agent3_running',
        'completed',
        'failed',
      ],
      default: 'submitted',
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDecision: { type: String, enum: ['approve', 'reject', 'more_info'] },
    approvalNotes: String,
    agent1Output: mongoose.Schema.Types.Mixed,
    agent2Output: mongoose.Schema.Types.Mixed,
    agent3Output: mongoose.Schema.Types.Mixed,
    integrations: {
      github: { created: Boolean, issues: [String], simulated: Boolean },
      slack: { sent: Boolean, simulated: Boolean },
      gmail: { sent: Boolean, simulated: Boolean },
      notion: { updated: Boolean, pageUrl: String, simulated: Boolean },
    },
    currentStep: String,
    error: String,
  },
  { timestamps: true }
)

projectSchema.index({ status: 1, createdAt: -1 })
projectSchema.index({ submittedBy: 1 })

export const Project = mongoose.model('Project', projectSchema)

const agentHistorySchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    agent: { type: String, enum: ['agent1', 'agent2', 'agent3', 'orchestrator'], required: true },
    action: { type: String, required: true },
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    reasoning: String,
    durationMs: Number,
    status: { type: String, enum: ['success', 'failure', 'pending'], default: 'success' },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

agentHistorySchema.index({ projectId: 1, createdAt: 1 })
agentHistorySchema.index({ agent: 1 })

export const AgentHistory = mongoose.model('AgentHistory', agentHistorySchema)

const auditLogSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    details: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: true }
)

auditLogSchema.index({ projectId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1 })

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
