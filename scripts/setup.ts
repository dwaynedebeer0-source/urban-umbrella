/**
 * Interactive admin setup wizard.
 * Run via: pnpm setup
 */
import { input, password, confirm, number } from "@inquirer/prompts";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const ENV_PATH = join(ROOT, ".env");
const CONTACTS_PATH = join(ROOT, "contacts.json");

// ─── Helpers ────────────────────────────────────────────────────────────────

function printBanner() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║     Email Agent — Setup Wizard       ║");
  console.log("╚══════════════════════════════════════╝\n");
}

function writeEnv(values: Record<string, string>) {
  const lines = Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  writeFileSync(ENV_PATH, lines + "\n", "utf-8");
  console.log(`\n  ✓ Written to ${ENV_PATH}`);
}

function writeContacts(contacts: Contact[]) {
  writeFileSync(CONTACTS_PATH, JSON.stringify(contacts, null, 2) + "\n", "utf-8");
  console.log(`  ✓ Written to ${CONTACTS_PATH}`);
}

interface Contact {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  role: string;
}

// ─── Validators ─────────────────────────────────────────────────────────────

function required(v: string) {
  return v.trim().length > 0 || "This field is required";
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Enter a valid email";
}

function isE164(v: string) {
  return /^\+[1-9]\d{7,14}$/.test(v.trim()) || "Enter a valid E.164 number (e.g. +15550001234)";
}

// ─── Connectivity checks ─────────────────────────────────────────────────────

async function testGraphToken(tenantId: string, clientId: string, clientSecret: string): Promise<boolean> {
  try {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
    });
    const res = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      { method: "POST", body }
    );
    const data = await res.json() as { access_token?: string; error?: string };
    return !!data.access_token;
  } catch {
    return false;
  }
}

async function testAnthropic(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function testWhatsApp(token: string, phoneNumberId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

printBanner();
console.log("This wizard will configure your email agent.\n");

// 1. Azure credentials
console.log("── Step 1: Azure AD (Microsoft Graph) ──\n");

const tenantId = await input({
  message: "Azure Tenant ID:",
  validate: required,
});

const clientId = await input({
  message: "Azure Client ID (Application ID):",
  validate: required,
});

const clientSecret = await password({
  message: "Azure Client Secret:",
  validate: (v) => (v.trim().length > 0 ? true : "Required"),
});

const mailboxUserId = await input({
  message: "Monitored mailbox UPN (e.g. agent@company.com):",
  validate: isEmail,
});

console.log("\n  Testing Microsoft Graph token acquisition...");
const graphOk = await testGraphToken(tenantId, clientId, clientSecret);
if (graphOk) {
  console.log("  ✓ Graph token acquired successfully");
} else {
  console.log("  ✗ Could not acquire Graph token — check credentials and admin consent");
  const proceed = await confirm({ message: "Continue anyway?", default: false });
  if (!proceed) process.exit(1);
}

// 2. Anthropic
console.log("\n── Step 2: Anthropic ──\n");

const anthropicKey = await password({
  message: "Anthropic API Key:",
  validate: (v) => (v.trim().length > 0 ? true : "Required"),
});

console.log("\n  Testing Anthropic API key...");
const anthropicOk = await testAnthropic(anthropicKey);
console.log(anthropicOk ? "  ✓ Anthropic API reachable" : "  ✗ Anthropic API unreachable — check key");

// 3. WhatsApp
console.log("\n── Step 3: WhatsApp Business API ──\n");

const waToken = await password({
  message: "WhatsApp Access Token (permanent system user token):",
  validate: (v) => (v.trim().length > 0 ? true : "Required"),
});

const waPhoneId = await input({
  message: "WhatsApp Phone Number ID:",
  validate: required,
});

const waBusinessId = await input({
  message: "WhatsApp Business Account ID:",
  validate: required,
});

console.log("\n  Testing WhatsApp phone number ID...");
const waOk = await testWhatsApp(waToken, waPhoneId);
console.log(waOk ? "  ✓ WhatsApp phone number ID resolved" : "  ✗ Could not resolve phone number ID — check token and ID");

// 4. Agent behaviour
console.log("\n── Step 4: Agent behaviour ──\n");

const pollIntervalRaw = await number({
  message: "Poll interval in seconds (default 60):",
  default: 60,
  validate: (v) => (v !== undefined && v > 0 ? true : "Must be > 0"),
});
const pollIntervalMs = (pollIntervalRaw ?? 60) * 1000;

const logLevel = await input({
  message: "Log level (trace/debug/info/warn/error):",
  default: "info",
  validate: (v) =>
    ["trace", "debug", "info", "warn", "error", "fatal"].includes(v.trim())
      ? true
      : "Invalid log level",
});

// 5. Write .env
console.log("\n── Writing .env ──");

writeEnv({
  AZURE_TENANT_ID: tenantId,
  AZURE_CLIENT_ID: clientId,
  AZURE_CLIENT_SECRET: clientSecret,
  MAILBOX_USER_ID: mailboxUserId,
  ANTHROPIC_API_KEY: anthropicKey,
  WHATSAPP_ACCESS_TOKEN: waToken,
  WHATSAPP_PHONE_NUMBER_ID: waPhoneId,
  WHATSAPP_BUSINESS_ACCOUNT_ID: waBusinessId,
  POLL_INTERVAL_MS: String(pollIntervalMs),
  LOG_LEVEL: logLevel,
});

// 6. Contacts
console.log("\n── Step 5: Internal contacts ──\n");

const existingContacts: Contact[] = existsSync(CONTACTS_PATH)
  ? (JSON.parse(readFileSync(CONTACTS_PATH, "utf-8")) as Contact[])
  : [];

const contacts: Contact[] = [...existingContacts];

let addMore = await confirm({ message: "Add an internal contact?", default: true });

while (addMore) {
  const name = await input({ message: "Full name:", validate: required });
  const email = await input({ message: "Email address:", validate: isEmail });
  const whatsapp = await input({ message: "WhatsApp number (E.164):", validate: isE164 });
  const role = await input({ message: "Role/title:", validate: required });

  const id = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
  contacts.push({ id, name, email: email.trim(), whatsapp: whatsapp.trim(), role });

  console.log(`  ✓ Added ${name}`);
  addMore = await confirm({ message: "Add another contact?", default: false });
}

writeContacts(contacts);

// 7. Summary
console.log("\n══════════════════════════════════════════");
console.log("  Setup complete. Summary:");
console.log(`  • Mailbox: ${mailboxUserId}`);
console.log(`  • Poll interval: ${pollIntervalMs / 1000}s`);
console.log(`  • Contacts: ${contacts.length}`);
console.log(`  • Graph token: ${graphOk ? "OK" : "FAILED"}`);
console.log(`  • Anthropic: ${anthropicOk ? "OK" : "FAILED"}`);
console.log(`  • WhatsApp: ${waOk ? "OK" : "FAILED"}`);
console.log("\n  Next steps:");
console.log("  1. Ensure the Azure app has Mail.Read + Mail.Send application permissions with admin consent");
console.log("  2. Create and approve the 'agent_notification' WhatsApp template in Meta Business Manager");
console.log("  3. Run: pnpm dev");
console.log("══════════════════════════════════════════\n");
