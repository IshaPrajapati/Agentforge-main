# AgentForge — AI Multi-Agent Orchestration Platform
# About AgentForge

AgentForge is an autonomous AI-agent platform designed to streamline software engineering planning. 
By utilizing a LangGraph state machine, the system guides a project proposal through a series of specialized AI steps:

1. **Agent 1: Senior Requirements Analyst**
   - Decomposes high-level project descriptions into structured, priority-ranked development modules with timeline estimations.
2. **Agent 2: Risk Manager & Feasibility Assessor**
   - Audits the proposed timelines and budgets, flagging schedule risks and determining if human intervention is required.
3. **AI Moderator**
   - Dynamically resolves contradictions and timeline disagreements between the Analyst and Risk Manager to build consensus.
4. **Human-in-the-Loop Approval Gate**
   - Pauses execution on high-risk projects, prompting an engineering manager to review the agent's plan, request changes, or approve deployment.
5. **Agent 3: Execution Agent**
   - Dispatches approved projects directly to team workspaces, automatically creating Notion boards, GitHub tracking issues, Slack notifications, and email summaries.

### Technical Stack
* **Frontend:** React, Vite, Tailwind CSS, Lucide icons.
* **Backend:** Node.js, Express, LangGraph, LangChain ESM.
* **Orchestration:** State-machine state graphs for multi-agent routing.
* **Database:** Custom simulated MongoDB/Mongoose JSON database configured to run write-safe on serverless temporary directories (`/tmp`).
* **Deployment:** Hosted as a monorepo on Vercel with serverless API functions.


## Quick Start

### 1. Backend
```powershell
cd agentforge/backend
copy .env.example .env
npm install
npm start
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
