import { config } from "../config.js";

interface TeamsPayload {
  subject: string;
  message: string;
}

/**
 * POST a notification to the configured Power Automate HTTP trigger.
 * The flow is responsible for forwarding it to the Teams channel.
 * Payload fields: { subject, message }
 */
export async function sendTeamsNotification(
  subject: string,
  message: string
): Promise<void> {
  if (!config.TEAMS_WEBHOOK_URL) {
    throw new Error("TEAMS_WEBHOOK_URL is not configured");
  }

  const payload: TeamsPayload = { subject, message };

  const res = await fetch(config.TEAMS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Teams webhook error (${res.status}): ${body}`);
  }
}
