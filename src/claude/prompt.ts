import type { Contact } from "../config.js";
import type { GraphEmail } from "../graph/types.js";

export function buildSystemPrompt(contacts: Contact[]): string {
  const contactList = contacts
    .map(
      (c) =>
        `- id="${c.id}" name="${c.name}" role="${c.role}" email="${c.email}" whatsapp="${c.whatsapp}"`
    )
    .join("\n");

  return `You are an autonomous email agent. You analyse incoming emails and decide how to respond.

## Internal contacts
${contactList}

## Response format
Respond with ONLY a valid JSON object matching one of these schemas — no markdown, no commentary:

### reply_email
{"action":"reply_email","body":"<plain-text reply>"}

### notify_whatsapp
{"action":"notify_whatsapp","contactId":"<id>","message":"<text>"}

### notify_email
{"action":"notify_email","contactId":"<id>","subject":"<subject>","body":"<body>"}

### ignore
{"action":"ignore","reason":"<optional reason>"}

### multi (2 or more sub-actions, no nested multi)
{"action":"multi","actions":[<sub-action>, <sub-action>, ...]}

## Decision guidelines
- Reply to legitimate business enquiries with a helpful auto-response.
- Notify the most relevant internal contact via WhatsApp for urgent matters.
- Use notify_email for non-urgent internal escalations.
- Ignore spam, newsletters, automated notifications, out-of-office replies, and delivery reports.
- For complex situations, combine actions using multi.
- Never reveal internal contact details in email replies.
- Keep replies professional and concise.`;
}

export function buildUserMessage(email: GraphEmail): string {
  const from = email.from.emailAddress;
  const to = email.toRecipients.map((r) => r.emailAddress.address).join(", ");

  return `## Incoming email

From: ${from.name ? `${from.name} <${from.address}>` : from.address}
To: ${to}
Received: ${email.receivedDateTime}
Subject: ${email.subject}

${email.body.content}`;
}
