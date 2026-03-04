import { contacts } from "../config.js";
import { logger } from "../logger.js";
import { sendReply, sendEmail } from "../graph/mail.js";
import type { GraphEmail } from "../graph/types.js";
import { sendWhatsAppNotification } from "../whatsapp/client.js";
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
      const contact = findContact(subAction.contactId);
      logger.info(
        { emailId: email.id, contactId: contact.id, to: contact.whatsapp },
        "Sending WhatsApp notification"
      );
      await sendWhatsAppNotification(contact.whatsapp, subAction.message);
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
