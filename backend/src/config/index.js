import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/agentforge',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  github: {
    token: process.env.GITHUB_TOKEN || '',
    owner: process.env.GITHUB_OWNER || '',
    repo: process.env.GITHUB_REPO || '',
  },
  notion: {
    token: process.env.NOTION_TOKEN || '',
    databaseId: process.env.NOTION_DATABASE_ID || '',
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  },
  gmail: {
    user: process.env.GMAIL_USER || '',
    appPassword: process.env.GMAIL_APP_PASSWORD || '',
    notificationEmail: process.env.NOTIFICATION_EMAIL || '',
  },
}
