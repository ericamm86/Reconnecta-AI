import express from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { interactionSchema } from "./interaction.schemas.js";
import { createInteraction, listInteractions } from "./interactions.repository.js";

export const interactionsRouter = express.Router();

interactionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await listInteractions(req.query.contactId);
    res.json({ data });
  })
);

interactionsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = interactionSchema.parse(req.body);
    const data = await createInteraction(payload);
    res.status(201).json({ data });
  })
);
