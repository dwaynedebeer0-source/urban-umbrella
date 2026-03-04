import { z } from "zod";

const ReplyEmailAction = z.object({
  action: z.literal("reply_email"),
  body: z.string().min(1).describe("Plain-text reply body"),
});

const NotifyWhatsAppAction = z.object({
  action: z.literal("notify_whatsapp"),
  contactId: z.string().min(1),
  message: z.string().min(1).describe("Notification text (max ~1024 chars)"),
});

const NotifyEmailAction = z.object({
  action: z.literal("notify_email"),
  contactId: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

const NotifyTeamsAction = z.object({
  action: z.literal("notify_teams"),
  subject: z.string().min(1),
  message: z.string().min(1),
});

const IgnoreAction = z.object({
  action: z.literal("ignore"),
  reason: z.string().optional(),
});

// Recursive multi — wraps 2 or more sub-actions (no nested multi)
const SubAction = z.discriminatedUnion("action", [
  ReplyEmailAction,
  NotifyWhatsAppAction,
  NotifyEmailAction,
  NotifyTeamsAction,
  IgnoreAction,
]);

const MultiAction = z.object({
  action: z.literal("multi"),
  actions: z.array(SubAction).min(2),
});

export const ClaudeActionSchema = z.discriminatedUnion("action", [
  ReplyEmailAction,
  NotifyWhatsAppAction,
  NotifyEmailAction,
  NotifyTeamsAction,
  IgnoreAction,
  MultiAction,
]);

export type ClaudeAction = z.infer<typeof ClaudeActionSchema>;
export type SubAction = z.infer<typeof SubAction>;
