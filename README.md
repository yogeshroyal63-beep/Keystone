# Keystone

> Turn project conversation into decisions, deadlines, and work that can actually move.

**Status:** Hackathon-ready prototype | **License:** [MIT](LICENSE)

## Contents

- [Why Keystone](#why-keystone)
- [What it does](#what-it-does)
- [Stack](#stack)
- [Quick start](#quick-start)
- [Demo](#demo)
- [API](#api)
- [Engineering notes](docs/engineering-notes.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [License](LICENSE)

## Why Keystone

Keystone turns unstructured project communication into structured, searchable project information.

Construction projects do not suffer from too little communication. They suffer from decisions, deadlines and tasks being buried inside WhatsApp threads, email chains, site notes and meeting transcripts. Keystone reads that communication and pulls out what someone actually has to act on.

## What it does

Paste a conversation from any channel. Keystone splits it into structured messages, reads the whole project thread with an LLM, and produces a summary, tasks with owners and deadlines, decisions and pending approvals, and contradictions between what different people said. Everything stays searchable as a project memory.

### Problem statement coverage

| Requirement | Where it lives |
| --- | --- |
| Conversation capture | **Add conversation** panel on the thread page → `POST /api/projects/:id/ingest`. Parses WhatsApp exports, email chains, meeting transcripts and loose notes |
| Intelligent summarization | Digest panel on the thread page → `Digest` model |
| Action extraction | Tasks page → `ActionItem` model |
| Responsibility detection | `owner` on each task, inferred from the conversation |
| Deadline detection | `dueDate` on each task, resolved from phrasing like "by Friday" or "before the 12th" against today's date. Overdue and due-soon tasks are marked |
| Decision & approval extraction | Decisions page, split into *waiting on approval* and *settled* |
| Conversation-to-task conversion | Extracted actions are working tasks: they can be completed and reopened, and that state survives re-analysis |
| Searchable project memory | Memory page — opens as a browsable log of the whole project, with search across messages, tasks and decisions |

Beyond the brief, Keystone also flags **contradictions** — where two people in the same project said incompatible things — which is the failure mode that causes rework on site.

## Stack

- Frontend: React + Vite + Tailwind CSS + React Router
- Backend: Express + Mongoose + JWT auth
- Database: MongoDB
- LLM: Groq API, `llama-3.3-70b-versatile`

## Prerequisites

- Node.js 18+
- MongoDB running locally at `mongodb://127.0.0.1:27017/keystone`
- A Groq API key from https://console.groq.com/keys

## Quick start

1. Create the environment file and fill in the values:
   ```bash
   cp .env.example .env
   ```
   `GROQ_API_KEY` is read by the backend only and is never exposed to the frontend.

2. Install dependencies:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

3. Seed the demo data:
   ```bash
   cd server && npm run seed
   ```

For Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp .env.example .env`.

Generate a strong local JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit `.env`, API keys, database credentials, or production JWT secrets. The server now refuses to start when `JWT_SECRET` is missing.

## Run

Start MongoDB, then two terminals:

```bash
# Terminal 1 — API on :5000
cd server && npm run dev
```

```bash
# Terminal 2 — frontend
cd client && npm run dev -- --host
```

Open the Vite URL and sign in.

## Demo

- Email: `ava@keystone.app`
- Password: `keystone123`

## Demo script

The seed creates three projects on purpose. Two are noisy, to show the overload problem. **Harbour Point Retrofit** is nearly empty, so the live capture is visible rather than lost in a long thread.

**1. Show the problem.** Open **Cedar House Annex**. Nineteen messages across WhatsApp, email and site notes. Scroll it — a deadline, an approval and a contradiction are all in there, and none of them are obvious.

**2. Show the extraction.** The digest panel on the right has already read the thread: a summary, tasks with owners and due dates, decisions split from pending approvals, and the contradictions. Point out that "14 March" and "12 March" were both stated by different people and Keystone caught it.

**3. Show the tasks are real.** Open **Tasks**. Overdue items are marked. Mark one done. Return to the thread and back — the state holds, because re-analysis reconciles rather than rebuilding.

**4. Capture a live conversation.** Open **Harbour Point Retrofit** — three messages, almost nothing extracted. Click **Add conversation**, leave the channel on WhatsApp, and paste:

```
[14/05/26, 8:12 AM] Dev: Structural comments are back. Beam strengthening is approved as drawn.
[14/05/26, 8:15 AM] Priya: Noted. That means the steel order has to be placed by 22 May or we miss the fabrication slot.
[14/05/26, 8:19 AM] Dev: I'll raise the purchase order today and send it to you for sign-off.
[14/05/26, 8:24 AM] Priya: Hold on — the cladding spec is still pending approval, don't order that part yet.
```

Submit. Keystone splits it into four messages, re-reads the project, and the digest fills in: a decision (beam strengthening approved), a pending approval (cladding spec), a deadline (22 May) and a task owned by Dev.

**5. Show the memory.** Open **Memory**. It opens as the full project log. Search `cladding` — the pending approval and the message it came from both surface.

**6. Optional.** Toggle light mode from the header; sign off the pending approval on the Decisions page.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/projects` | Projects with open-task and unresolved-conflict counts |
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/projects/:id/messages` | Full thread |
| `POST` | `/api/projects/:id/ingest` | **Capture a pasted conversation**, then analyse |
| `POST` | `/api/projects/:id/analyze` | Re-read the thread with the LLM |
| `GET` | `/api/projects/:id/digest` | Latest summary |
| `GET` | `/api/projects/:id/actions` | Tasks |
| `PATCH` | `/api/projects/actions/:actionId` | Complete, reopen, or reassign a task |
| `GET` | `/api/projects/:id/decisions` | Decisions and pending approvals |
| `PATCH` | `/api/projects/decisions/:decisionId/approve` | Sign off a pending approval |
| `GET` | `/api/projects/:id/conflicts` | Contradictions |
| `PATCH` | `/api/projects/conflicts/:conflictId/resolve` | Resolve a contradiction |
| `GET` | `/api/projects/:id/memory?q=` | Project memory. Omit `q` to browse the full log |

## Implementation notes

**Conversation parsing** (`server/src/services/transcriptParser.js`) handles the formats teams actually paste: bracketed and dashed WhatsApp exports, meeting transcripts with timecodes, and email chains where `From:` sets the sender and `Subject:` is kept as content because deadlines often live there. Wrapped lines fold into the message above them, export noise is stripped, and a stoplist prevents lines like `Note:` or `Deadline:` being read as a speaker. Anything unrecognised is preserved as a single note rather than dropped.

**Re-analysis preserves human work.** Extraction used to delete and recreate every record on each run, which meant a completed task came back open and a resolved contradiction came back unresolved. Records are now matched on their normalised description, so status, resolutions and manual sign-offs survive. Analysis runs automatically only when a project has no digest yet; after that it is on the **Re-analyze** button.

**Theming.** Every colour is a CSS variable defined once per theme in `client/src/index.css`, and every Tailwind token resolves to one of those variables. No component hardcodes a colour, so one `data-theme` attribute re-themes the whole app. The theme is set by an inline script in `index.html` before first paint to avoid a flash, follows the operating system until someone chooses explicitly, then persists.

**Auth** uses a JWT access token plus a refresh token. Project routes check membership before returning anything.

## Engineering quality

- **Configuration is explicit:** required secrets fail fast instead of silently falling back to demo credentials.
- **Human decisions win:** re-analysis updates extracted facts without reopening completed tasks, resolved conflicts, or signed-off approvals.
- **Graceful degradation:** a failed AI request returns the latest cached digest when one exists, so the project record remains usable.
- **Input is preserved:** transcript lines that do not match a known export format are retained as notes instead of being discarded.
- **Access is scoped:** authenticated project routes verify membership before returning project data.

## Current scope

Keystone is a focused prototype, not a production-certified construction records system. It currently supports pasted conversation ingestion, MongoDB persistence, JWT authentication, Groq-powered extraction, project-level search, and a responsive React interface. It does not yet provide file uploads, organization-level tenancy, audit-log exports, background job orchestration, or automated test coverage.

The known tradeoffs and the hardest parts of the build are recorded in [Engineering Notes](docs/engineering-notes.md). Keeping those constraints visible makes the next iteration easier to prioritize.

## Roadmap

- Add automated parser, route, and reconciliation tests.
- Move AI analysis to a queued background job with retry and rate-limit handling.
- Add organization workspaces, invitations, roles, and tenant isolation.
- Support uploaded documents and provider integrations alongside paste-based capture.
- Add immutable audit events and exportable project records.
- Add CI for linting, builds, dependency review, and security checks.

## Contributing

Small, focused pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing the parser, authentication, or AI reconciliation behavior.

## Security

Please do not report vulnerabilities in public issues. Follow the private reporting guidance in [SECURITY.md](SECURITY.md).

## License

Keystone is released under the [MIT License](LICENSE).
#   K e y s t o n e 
 
 #   K e y s t o n e 
 
 #   K e y s t o n e 
 
