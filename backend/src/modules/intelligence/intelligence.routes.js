import express from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { listContacts } from "../contacts/contacts.repository.js";
import { generateConnectionIntelligence, generateCopilotChatResponse } from "./intelligence.service.js";

export const intelligenceRouter = express.Router();

const copilotChatSchema = z.object({
  prompt: z.string().min(1).max(2000),
  intent: z.string().optional().default("search_contacts"),
  contextContacts: z.array(z.record(z.string(), z.unknown())).max(6).default([])
});

intelligenceRouter.get(
  "/recommendations",
  asyncHandler(async (req, res) => {
    const contacts = await listContacts(req.user, {});
    const selected = contacts.slice(0, 3);
    const data = await Promise.all(selected.map((contact) => generateConnectionIntelligence(contact)));
    res.json({ data });
  })
);

intelligenceRouter.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const payload = copilotChatSchema.parse(req.body);
    const data = await generateCopilotChatResponse(payload);
    res.json({ data });
  })
);
