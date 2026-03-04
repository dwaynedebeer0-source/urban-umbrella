import { config } from "./config.js";
import { logger } from "./logger.js";
import { runScheduler } from "./scheduler.js";
import { fetchUnreadEmails, markAsRead } from "./graph/mail.js";
import { analyzeEmail } from "./claude/client.js";
import { executeAction } from "./actions/executor.js";
import { hasBeenProcessed, markProcessed, logEvent } from "./state/db.js";

async function processInbox(): Promise<void> {
  const emails = await fetchUnreadEmails();
  logger.debug({ count: emails.length }, "Fetched unread emails");

  for (const email of emails) {
    if (hasBeenProcessed(email.id)) {
      logger.debug({ emailId: email.id }, "Already processed — skipping");
      continue;
    }

    const from = email.from.emailAddress.address;
    logger.info(
      { emailId: email.id, from, subject: email.subject },
      "Processing email"
    );

    let actionName = "error";
    try {
      const action = await analyzeEmail(email);
      actionName = action.action;

      logger.info(
        { emailId: email.id, action: actionName },
        "Claude decision"
      );

      // Mark processed before executing so a crash mid-action won't cause a retry loop
      markProcessed(
        email.id,
        email.receivedDateTime,
        email.subject,
        from,
        actionName
      );

      await executeAction(action, email);
      await markAsRead(email.id);

      logEvent(email.id, "executed", actionName);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ emailId: email.id, err }, "Failed to process email");

      // Record failure so we don't retry on the next poll
      markProcessed(
        email.id,
        email.receivedDateTime,
        email.subject,
        from,
        actionName
      );
      logEvent(email.id, "error", message);
    }
  }
}

// --- Graceful shutdown ---
const abortController = new AbortController();

function shutdown(signal: string): void {
  logger.info({ signal }, "Shutdown signal received");
  abortController.abort();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// --- Main ---
logger.info("Email agent starting");

await runScheduler(
  processInbox,
  config.POLL_INTERVAL_MS,
  abortController.signal
);

logger.info("Email agent stopped");
