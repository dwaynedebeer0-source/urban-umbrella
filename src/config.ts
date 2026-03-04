import { readFileSync } from "fs";
import { z } from "zod";

const EnvSchema = z.object({
  AZURE_TENANT_ID: z.string().min(1),
  AZURE_CLIENT_ID: z.string().min(1),
  AZURE_CLIENT_SECRET: z.string().min(1),
  MAILBOX_USER_ID: z.string().email(),
  ANTHROPIC_API_KEY: z.string().min(1),
  // WhatsApp — optional; notify_whatsapp actions are skipped if absent
  WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().min(1).optional(),
  // Teams — optional; notify_teams actions are skipped if absent
  TEAMS_WEBHOOK_URL: z.string().url().optional(),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
});

export type Config = z.infer<typeof EnvSchema>;

function loadEnv(): Config {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const ContactSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().regex(/^\+[1-9]\d{7,14}$/, "Must be E.164 format"),
  role: z.string().min(1),
});

export type Contact = z.infer<typeof ContactSchema>;

function loadContacts(path = "contacts.json"): Contact[] {
  const raw = readFileSync(path, "utf-8");
  const data = JSON.parse(raw) as unknown;
  return z.array(ContactSchema).parse(data);
}

export const config = loadEnv();
export const contacts = loadContacts();
