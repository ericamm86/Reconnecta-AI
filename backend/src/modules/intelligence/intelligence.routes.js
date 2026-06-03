import express from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { listContacts } from "../contacts/contacts.repository.js";
import { generateConnectionIntelligence } from "./intelligence.service.js";

export const intelligenceRouter = express.Router();

intelligenceRouter.get(
  "/recommendations",
  asyncHandler(async (req, res) => {
    const contacts = await listContacts(req.user.id, {});
    const selected = contacts.slice(0, 3);
    const data = await Promise.all(selected.map((contact) => generateConnectionIntelligence(contact)));
    res.json({ data });
  })
);
