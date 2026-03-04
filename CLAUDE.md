# Email Agent

Autonomous email agent: polls an Outlook inbox via Microsoft Graph, uses Claude to decide actions, executes replies and notifications.

## Commands

| Command | Description |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm setup` | Interactive setup wizard — writes `.env` and `contacts.json` |
| `pnpm dev` | Run with Bun watch mode (restarts on file change) |
| `pnpm start` | Run once (production) |
| `pnpm check` | TypeScript type-check + lint |

## First-time setup

1. `pnpm install`
2. `pnpm setup` — follow the prompts; it validates connectivity and writes all config
3. In Azure Portal: grant the app `Mail.Read` and `Mail.Send` **Application** permissions, then grant admin consent
4. In Meta Business Manager: create and get the `agent_notification` template approved (one body variable `{{1}}`)
5. `pnpm dev` — confirm "Scheduler started" in logs and that poll cycles run without error

## Required credentials

| Variable | Where to find it |
|---|---|
| `AZURE_TENANT_ID` | Azure AD > Overview > Tenant ID |
| `AZURE_CLIENT_ID` | App registrations > your app > Application (client) ID |
| `AZURE_CLIENT_SECRET` | App registrations > Certificates & secrets (copy on creation) |
| `MAILBOX_USER_ID` | UPN of monitored mailbox, e.g. `agent@company.com` |
| `ANTHROPIC_API_KEY` | console.anthropic.com > API Keys |
| `WHATSAPP_ACCESS_TOKEN` | Meta Business Manager > System Users > Generate Token (never-expiring) |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Developers > WhatsApp > API Setup |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Meta Developers > WhatsApp > API Setup |

## Architecture

```
index.ts
  └── scheduler.ts          while-true polling loop with AbortSignal
        └── processInbox()
              ├── graph/mail.ts        fetchUnreadEmails / markAsRead / sendReply / sendEmail
              ├── state/db.ts          SQLite duplicate guard
              ├── claude/client.ts     analyzeEmail() → ClaudeAction (Zod validated)
              └── actions/executor.ts  routes action to graph or whatsapp handlers
```

## Claude actions

Claude returns a discriminated union JSON object (validated by Zod):

- `reply_email` — reply to the sender via Graph
- `notify_whatsapp` — send a WhatsApp template notification to a contact
- `notify_email` — send an internal email to a contact
- `ignore` — mark as read, no further action
- `multi` — array of 2+ sub-actions executed in order

## Windows service (NSSM — recommended for production)

```powershell
# Install NSSM from https://nssm.cc/download
nssm install EmailAgent "C:\Users\user-pc\.bun\bin\bun.exe" "src/index.ts"
nssm set EmailAgent AppDirectory "C:\Users\user-pc\Desktop\ClaudeCodeTest\email-agent"
nssm set EmailAgent AppStdout "C:\logs\email-agent.log"
nssm set EmailAgent AppStderr "C:\logs\email-agent-error.log"
nssm set EmailAgent Start SERVICE_AUTO_START
nssm start EmailAgent
```

Alternatively, import `email-agent.xml` into Windows Task Scheduler.

## State database

SQLite at `state.db` (created automatically). Tables:

- `processed_emails` — one row per email; prevents duplicate processing
- `event_log` — audit trail of every action taken

Inspect with any SQLite browser or:
```bash
sqlite3 state.db "SELECT * FROM processed_emails ORDER BY processed_at DESC LIMIT 20;"
```

## Adding contacts

Edit `contacts.json` directly or re-run `pnpm setup`. Each contact needs:
- `id` — unique slug used in Claude's actions
- `name` — display name
- `email` — email address
- `whatsapp` — E.164 format (e.g. `+15550001234`)
- `role` — shown to Claude as context
