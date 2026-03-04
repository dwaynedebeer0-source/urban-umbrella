import Anthropic from "@anthropic-ai/sdk";
import { config, contacts } from "../config.js";
import { logger } from "../logger.js";
import type { GraphEmail } from "../graph/types.js";
import { ClaudeActionSchema, type ClaudeAction } from "./types.js";
import { buildSystemPrompt, buildUserMessage } from "./prompt.js";

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const systemPrompt = buildSystemPrompt(contacts);

export async function analyzeEmail(email: GraphEmail): Promise<ClaudeAction> {
  const userMessage = buildUserMessage(email);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text.trim());
  } catch {
    throw new Error(`Claude response is not valid JSON: ${textBlock.text.slice(0, 200)}`);
  }

  const result = ClaudeActionSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn({ zodError: result.error.format(), raw: parsed }, "Claude action failed Zod validation");
    throw new Error(`Claude action schema mismatch: ${result.error.message}`);
  }

  return result.data;
}
