import { getGraphToken } from "./auth.js";
import type { GraphEmail, GraphEmailList, SendMailPayload } from "./types.js";
import { config } from "../config.js";

const BASE = "https://graph.microsoft.com/v1.0";

async function graphRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getGraphToken();
  const url = `${BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph API ${options.method ?? "GET"} ${url} → ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Fetch unread emails from the monitored mailbox, newest first, max 50. */
export async function fetchUnreadEmails(): Promise<GraphEmail[]> {
  const userId = encodeURIComponent(config.MAILBOX_USER_ID);
  const params = new URLSearchParams({
    $filter: "isRead eq false",
    $orderby: "receivedDateTime desc",
    $top: "50",
    $select:
      "id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,isRead,conversationId,internetMessageId",
  });

  const data = await graphRequest<GraphEmailList>(
    `/users/${userId}/mailFolders/inbox/messages?${params}`
  );

  return data.value;
}

/** Mark a message as read. */
export async function markAsRead(messageId: string): Promise<void> {
  const userId = encodeURIComponent(config.MAILBOX_USER_ID);
  await graphRequest(`/users/${userId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ isRead: true }),
  });
}

/** Reply to a message using the Graph reply endpoint. */
export async function sendReply(
  messageId: string,
  replyBody: string
): Promise<void> {
  const userId = encodeURIComponent(config.MAILBOX_USER_ID);
  await graphRequest(`/users/${userId}/messages/${messageId}/reply`, {
    method: "POST",
    body: JSON.stringify({
      message: {},
      comment: replyBody,
    }),
  });
}

/** Send a fresh email from the monitored mailbox. */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const userId = encodeURIComponent(config.MAILBOX_USER_ID);
  const payload: SendMailPayload = {
    message: {
      subject,
      body: { contentType: "Text", content: body },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: true,
  };
  await graphRequest(`/users/${userId}/sendMail`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
