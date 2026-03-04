import { contacts, config } from "../config.js";
import { logger } from "../logger.js";
import { sendReply, sendEmail } from "../graph/mail.js";
import type { GraphEmail } from "../graph/types.js";
import { sendWhatsAppNotification } from "../whatsapp/client.js";
import { sendTeamsNotification } from "../teams/client.js";
import type { ClaudeAction, SubAction } from "../claude/types.js";

function findContact(contactId: string) {
  const contact = contacts.find((c) => c.id === contactId);
  if (!contact) throw new Error(`Unknown contactId: ${contactId}`);
  return contact;
}

async function executeSubAction(
  subAction: SubAction,
  email: GraphEmail
): Promise<void> {
  switch (subAction.action) {
    case "reply_email": {
      logger.info({ emailId: email.id }, "Sending reply");
      await sendReply(email.id, subAction.body);
      break;
    }

    case "notify_whatsapp": {
      if (!config.WHATSAPP_ACCESS_TOKEN) {
        logger.warn({ emailId: email.id }, "WhatsApp not configured — skipping notify_whatsapp");
        break;
      }
      const contact = findContact(subAction.contactId);
      logger.info(
        { emailId: email.id, contactId: contact.id, to: contact.whatsapp },
        "Sending WhatsApp notification"
      );
      await sendWhatsAppNotification(contact.whatsapp, subAction.message);
      break;
    }

    case "notify_teams": {
      if (!config.TEAMS_WEBHOOK_URL) {
        logger.warn({ emailId: email.id }, "Teams not configured — skipping notify_teams");
        break;
      }
      logger.info({ emailId: email.id }, "Sending Teams notification");
      await sendTeamsNotification(subAction.subject, subAction.message);
      break;
    }

    case "notify_email": {
      const contact = findContact(subAction.contactId);
      logger.info(
        { emailId: email.id, contactId: contact.id, to: contact.email },
        "Sending email notification"
      );
      await sendEmail(contact.email, subAction.subject, subAction.body);
      break;
    }

    case "ignore": {
      logger.info(
        { emailId: email.id, reason: subAction.reason },
        "Ignoring email"
      );
      break;
    }
  }
}

export async function executeAction(
  action: ClaudeAction,
  email: GraphEmail
): Promise<void> {
  if (action.action === "multi") {
    for (const sub of action.actions) {
      await executeSubAction(sub, email);
    }
  } else {
    await executeSubAction(action, email);
  }
}
