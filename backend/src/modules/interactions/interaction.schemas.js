import { z } from "zod";

export const interactionSchema = z.object({
  contactId: z.string().min(1),
  type: z.enum(["call", "email", "meeting", "dm", "note"]).default("note"),
  occurredAt: z.string().datetime().optional(),
  summary: z.string().min(3),
  notesMarkdown: z.string().default(""),
  sentiment: z.enum(["positive", "neutral", "risk"]).default("neutral")
});
