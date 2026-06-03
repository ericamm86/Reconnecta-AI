import express from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildInternalGraph, importContacts, listContacts } from "../contacts/contacts.repository.js";
import { contactImportSchema } from "../contacts/contact.schemas.js";
import { openApiDocument } from "./openapi.js";

export const docsRouter = express.Router();
export const apiV1Router = express.Router();

docsRouter.get(
  "/docs",
  asyncHandler(async (_req, res) => {
    res.json(openApiDocument);
  })
);

apiV1Router.get(
  "/contacts",
  asyncHandler(async (req, res) => {
    const data = await listContacts(req.user.id, req.query);
    res.json({ data });
  })
);

apiV1Router.post(
  "/contacts/import",
  asyncHandler(async (req, res) => {
    const payload = contactImportSchema.parse(req.body);
    const data = await importContacts(req.user.id, payload);
    res.status(202).json({ data });
  })
);

apiV1Router.get(
  "/graphs/internal",
  asyncHandler(async (req, res) => {
    const data = await buildInternalGraph(req.user.id);
    res.json({ data });
  })
);
