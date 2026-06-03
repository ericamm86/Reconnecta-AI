import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listContacts } from "./contacts/contacts.repository.js";
import { listInteractions } from "./interactions/interactions.repository.js";
import { generateConnectionIntelligence } from "./intelligence/intelligence.service.js";

export const dashboardRouter = express.Router();

dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const contacts = await listContacts(req.user.id, {});
    const interactions = await listInteractions();
    const active = contacts.filter((contact) => contact.proximity >= 70).length;
    const averageScore = contacts.length
      ? Math.round(contacts.reduce((sum, contact) => sum + contact.proximity, 0) / contacts.length)
      : 0;
    const recommendations = await Promise.all(
      contacts.slice(0, 3).map(async (contact) => ({
        contactId: contact.id,
        contactName: contact.name,
        ...(await generateConnectionIntelligence(contact))
      }))
    );

    res.json({
      data: {
        totalConnections: contacts.length,
        activeConnections: active,
        averageScore,
        latestInteractions: interactions.slice(0, 5),
        recommendations
      }
    });
  })
);
