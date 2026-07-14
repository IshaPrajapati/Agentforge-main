# AgentForge — AI Multi-Agent Orchestration Platform

> **AI proposes. Humans approve. Agents execute.**

AgentForge is a production-ready multi-agent orchestration platform that processes project specifications, performs risk and budget analyses, mediates agent conflicts, and deploys tasks to developer workspaces. It incorporates a **human-in-the-loop gate** to ensure that final plans are vetted by a manager before execution.

---

## 📖 About AgentForge

AgentForge is an autonomous AI-agent platform designed to streamline software engineering planning. By utilizing a **LangGraph** state machine, the system guides a project proposal through a series of specialized AI steps:

1. **Agent 1 (Requirements Analyst):** Converts vague product requests into structured, priority-ranked development modules.
2. **Agent 2 (Risk Manager):** Evaluates budget feasibility, scheduling risk, and flags projects requiring manual human approval.
3. **AI Moderator (Mediator):** Mediates conflicts between Agent 1 and Agent 2, compiling a pros/cons review list for decision-making.
4. **Human-in-the-Loop Approval Gate:** Pauses execution on high-risk projects, prompting an engineering manager to review the agent's plan, request changes, or approve deployment.
5. **Agent 3 (Execution Agent):** Dispatches approved projects directly to team workspaces, automatically creating Notion boards, GitHub tracking issues, Slack notifications, and email summaries.

---

## 🚀 Key Features

*   **Multi-Agent Orchestration:** Powered by a **LangGraph** state machine that manages transitions between different engineering roles.
*   **Intelligent Agent Pipeline:**
    *   Decomposes projects, estimates delivery timeframes, analyzes cost margins, and automatically detects conflicts.
*   **Human-In-The-Loop (HITL) Gateway:** Pauses high-risk or low-margin projects in an `awaiting_approval` state, providing a clean dashboard interface for managers to Approve, Reject, or Request Info.
*   **External Integration Engine:**
    *   **Notion:** Builds and dynamically updates a centralized project tracking board.
    *   **GitHub:** Generates tracked engineering issues labeled with modules and priority.
    *   **Slack:** Posts approval summaries to engineering channels.
    *   **Gmail:** Drafts and dispatches project briefing emails.
*   **Zero-Dependency Demo Mode:** Automatically falls back to simulated integration mocks and a custom rule-based heuristics engine if API keys are missing.
*   **Serverless JSON Database:** Includes a custom Mongoose-compatible file-system database with full CRUD querying support. On Vercel, it dynamically writes to `/tmp` to support read-only runtime environments.

---

## 📊 Platform Architecture

```mermaid
graph TD
    subgraph Frontend (React + Vite)
        UI[User Dashboard] -->|Submit Project| API_Endpoint
    end

    subgraph Backend (Express Node.js)
        API_Endpoint[Express API] -->|Triggers| Workflow[LangGraph State Machine]
        
        subgraph LangGraph Pipeline
            Start([Start]) --> A1[Agent 1: Analyst]
            A1 -->|Generate Modules| A2[Agent 2: Risk Manager]
            A2 -->|Risk Assessment| Cond{Approval Required?}
            
            Cond -->|Yes| Gate[Human Approval Gate]
            Cond -->|No| A3[Agent 3: Executor]
            
            Gate -->|Approve| A3
            Gate -->|Reject / Request Info| Reject([End / Rejected])
            
            A3 -->|Push Integrations| Finalize[Finalize Notion Page]
            Finalize --> End([End / Completed])
        end

        subgraph Local Database
            DB[(Local JSON Database)] <-->|Read/Write| Workflow
        end
    end

    subgraph Third-Party Integrations
        A1 -->|Create Page| Notion[(Notion)]
        A3 -->|Create Issues| GitHub[(GitHub)]
        A3 -->|Alert Channel| Slack[(Slack)]
        A3 -->|Notifications| Gmail[(Gmail)]
        Finalize -->|Update Badges| Notion
    end
```

---

## 🛠️ Quick Start (Local Setup)

### 1. Configure the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create your environment configuration file:
   ```bash
   copy .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Seed the database with demo users:
   ```bash
   npm run seed
   ```
5. Spin up the local API server:
   ```bash
   npm run dev
   ```

### 2. Configure the Frontend
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

### 3. Open the App
*   **Web Portal:** `http://localhost:5173`
*   **API Health:** `http://localhost:4000/api/health`

---

## 🔑 Demo Access Credentials

The database seeding command populates three test roles:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Engineering Manager** | `manager@agentforge.dev` | `manager123` |
| **Administrator** | `admin@agentforge.dev` | `admin123` |
| **Standard User** | `user@agentforge.dev` | `user123` |

---

## ⚙️ Environment Variables (`backend/.env`)

If keys are omitted, the application runs entirely in **Demo Mode**, simulating API requests:

*   `PORT`: Port for local server (defaults to `4000`).
*   `OPENAI_API_KEY`: API key for GPT-4o-mini execution (falls back to rule engine if missing).
*   `GITHUB_TOKEN`: GitHub personal access token for issue creation.
*   `GITHUB_OWNER` & `GITHUB_REPO`: Target repository paths.
*   `NOTION_TOKEN` & `NOTION_DATABASE_ID`: Notion integration workspace secrets.
*   `SLACK_WEBHOOK_URL`: Target Slack channel webhook URL.
*   `GMAIL_USER` & `GMAIL_APP_PASSWORD`: SMTP secrets for automated email reports.

---

## ☁️ Vercel Deployment

This project is optimized for deployment as a Vercel monorepo. It runs the frontend as static files and compiles the backend into serverless Express functions under a single URL context.

1.  Install the Vercel CLI locally:
    ```bash
    npm install -g vercel
    ```
2.  Login and link the project:
    ```bash
    vercel link --project agentforge --yes
    ```
3.  Deploy to production:
    ```bash
    vercel --prod --yes
    ```

*Note: Environment variables can be configured directly in your Vercel project dashboard under **Settings > Environment Variables**.*
