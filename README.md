# AgentForge — AI Multi-Agent Orchestration Platform

**Tagline:** *AI proposes. Humans approve. Agents execute.*

Production-ready hackathon project with 3 intelligent agents, human-in-the-loop approval, and integrations (Notion, GitHub, Slack, Gmail).

## Quick Start

### 1. Backend
```powershell
cd agentforge/backend
copy .env.example .env
npm install
npm run seed
npm run dev
```

### 2. Frontend
```powershell
cd agentforge/frontend
npm install
npm run dev
```

### 3. Open
- **App:** http://localhost:5173
- **API:** http://localhost:4000/api/health

### Demo Login
| Role | Email | Password |
|------|-------|----------|
| Manager | manager@agentforge.dev | manager123 |
| Admin | admin@agentforge.dev | admin123 |
| User | user@agentforge.dev | user123 |

## Demo Flow (3 minutes)

1. Login as **manager@agentforge.dev**
2. Go to **New Project** → Submit "Inventory System" (pre-filled)
3. Watch **Agent 1** analyze → **Agent 2** validate → status becomes **awaiting_approval**
4. Go to **Approvals** → Review recommendation → Click **Approve**
5. **Agent 3** runs → GitHub issues, Slack, Email, Notion (simulated without API keys)
6. View **Project Detail** → Timeline, agent outputs, integration badges

## Architecture

- **Frontend:** React + TailwindCSS + Vite
- **Backend:** Node.js + Express + MongoDB (in-memory fallback)
- **AI Engine:** LangGraph state machine with 3 agent nodes
- **Auth:** JWT with role-based access (admin, manager, user)
- **Integrations:** GitHub, Slack, Gmail, Notion (graceful simulation fallback)

## Agent Pipeline

```
Submit → Agent 1 (Analyst) → Agent 2 (Risk Manager) → [Approval Gate] → Agent 3 (Execution) → Done
```

## Environment Variables

See `backend/.env.example` for all configuration options. The system works without any API keys (demo mode with simulated integrations).

## Docker

```powershell
docker-compose up --build
```

## Tests

```powershell
cd backend
npm test
```
