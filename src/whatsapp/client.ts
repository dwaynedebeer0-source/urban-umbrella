import { config } from "../config.js";

const BASE = "https://graph.facebook.com/v20.0";

interface WhatsAppResponse {
  messages?: Array<{ id: string }>;
  error?: { message: string; code: number };
}

async function whatsappRequest(
  endpoint: string,
  payload: unknown
): Promise<WhatsAppResponse> {
  const url = `${BASE}${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as WhatsAppResponse;

  if (!res.ok || data.error) {
    const msg = data.error?.message ?? res.statusText;
    throw new Error(`WhatsApp API error (${res.status}): ${msg}`);
  }

  return data;
}

/**
 * Send a template message using the pre-approved `agent_notification` template.
 * The template must have a single body variable {{1}}.
 */
export async function sendWhatsAppNotification(
  to: string,
  message: string
): Promise<void> {
  await whatsappRequest(
    `/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: "agent_notification",
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: message }],
          },
        ],
      },
    }
  );
}

/**
 * Send a freeform text message (only valid within the 24-hour conversation window).
 */
export async function sendWhatsAppFreeform(
  to: string,
  message: string
): Promise<void> {
  await whatsappRequest(
    `/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }
  );
}
