import { Database } from "bun:sqlite";
import { join } from "path";

const DB_PATH = join(process.cwd(), "state.db");

const db = new Database(DB_PATH);

// Enable WAL for better concurrent read performance
db.run("PRAGMA journal_mode = WAL");

db.run(`
  CREATE TABLE IF NOT EXISTS processed_emails (
    id TEXT PRIMARY KEY,
    received_at TEXT NOT NULL,
    subject TEXT NOT NULL,
    from_address TEXT NOT NULL,
    action TEXT NOT NULL,
    processed_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS event_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id TEXT NOT NULL,
    event TEXT NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const stmtHasProcessed = db.query<{ id: string }, [string]>(
  "SELECT id FROM processed_emails WHERE id = ?"
);

const stmtMarkProcessed = db.query<void, [string, string, string, string, string]>(
  "INSERT OR IGNORE INTO processed_emails (id, received_at, subject, from_address, action) VALUES (?, ?, ?, ?, ?)"
);

const stmtLogEvent = db.query<void, [string, string, string | null]>(
  "INSERT INTO event_log (email_id, event, detail) VALUES (?, ?, ?)"
);

export function hasBeenProcessed(emailId: string): boolean {
  return stmtHasProcessed.get(emailId) !== null;
}

export function markProcessed(
  emailId: string,
  receivedAt: string,
  subject: string,
  fromAddress: string,
  action: string
): void {
  stmtMarkProcessed.run(emailId, receivedAt, subject, fromAddress, action);
}

export function logEvent(
  emailId: string,
  event: string,
  detail?: string
): void {
  stmtLogEvent.run(emailId, event, detail ?? null);
}
