# Services & Daemons (`scripts/services/`)

## 1. Purpose & Scope
Contains daemon processes, MCP protocol servers, Google Jules task orchestrators, and real-time user feedback listeners.

## 2. Key Modules & Scripts
| Script | Entrypoint / Command | Description |
|---|---|---|
| `mcp_server.js` | `node scripts/mcp_server.js` | Model Context Protocol (MCP) server exposing BOQ evaluation, scraping, and knowledge tools to IDEs and agents. |
| `jules_task_manager.js` | `node scripts/jules_task_manager.js <cmd>` | Google Jules autonomous agent task orchestrator (`list`, `create`, `status`, `send`, `audit`). |
| `feedback_listener.js` | `node scripts/feedback_listener.js` | WebSocket / SSE listener processing HITL (Human-in-the-Loop) rule adjustments. |

## 3. Autonomous Jules Protocol (INV-10, INV-11, INV-12)
- **INV-10 (Notification)**: Agents modifying code on a Jules branch must send an explicit verification update via `scripts/jules_task_manager.js send <sessionId> "..."`.
- **INV-11 (Branch Pruning)**: Agents must prune merged feature branches from GitHub (`git push origin --delete <branch>`) upon completion.
- **INV-12 (Audit Before Retirement)**: Agents must execute `scripts/jules_task_manager.js audit <sessionId>` to extract unpushed patches and test suites before session termination.
