import express from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { contactImportSchema, contactSchema, contactUpdateSchema, duplicateActionSchema, googleContactsImportSchema } from "./contact.schemas.js";
import {
  buildInternalGraph,
  createContact,
  deleteContact,
  getContact,
  ignoreDuplicatePair,
  importContacts,
  listContacts,
  listPotentialDuplicates,
  updateContact
} from "./contacts.repository.js";
import { listInteractions } from "../interactions/interactions.repository.js";
import { generateConnectionIntelligence } from "../intelligence/intelligence.service.js";

export const contactsRouter = express.Router();

contactsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await listContacts(req.user.id, req.query);
    res.json({ data });
  })
);

contactsRouter.get(
  "/duplicates",
  asyncHandler(async (req, res) => {
    const data = await listPotentialDuplicates(req.user.id);
    res.json({ data });
  })
);

contactsRouter.get(
  "/graph/internal",
  asyncHandler(async (req, res) => {
    const data = await buildInternalGraph(req.user.id);
    res.json({ data });
  })
);

contactsRouter.post(
  "/import",
  asyncHandler(async (req, res) => {
    const payload = contactImportSchema.parse(req.body);
    const data = await importContacts(req.user.id, payload);
    res.status(202).json({ data });
  })
);

contactsRouter.post(
  "/import/google",
  asyncHandler(async (req, res) => {
    const { accessToken } = googleContactsImportSchema.parse(req.body);
    const response = await fetch("https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos,organizations,biographies,urls&pageSize=500", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Google Contacts import failed" });
    }

    const payload = await response.json();
    const rows = (payload.connections || [])
      .map((person) => ({
        name: person.names?.[0]?.displayName,
        avatarUrl: person.photos?.[0]?.url || "",
        description: person.biographies?.[0]?.value || "",
        email: person.emailAddresses?.[0]?.value || "",
        emails: (person.emailAddresses || []).map((email) => email.value).filter(Boolean),
        phones: (person.phoneNumbers || []).map((phone) => phone.value).filter(Boolean),
        company: person.organizations?.[0]?.name || "",
        role: person.organizations?.[0]?.title || "",
        tags: ["google_contacts"],
        sourceOrigin: "google_contacts",
        socialLinks: {
          custom: person.urls?.[0]?.value || ""
        }
      }))
      .filter((contact) => contact.name);

    const data = await importContacts(req.user.id, { source: "google_contacts", rows });
    res.status(202).json({ data });
  })
);

contactsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const contact = await getContact(req.user.id, req.params.id);
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    const timeline = await listInteractions(contact.id);
    res.json({ data: { ...contact, timeline } });
  })
);

contactsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = contactSchema.parse(req.body);
    const data = await createContact(req.user.id, payload);
    res.status(201).json({ data });
  })
);

contactsRouter.post(
  "/duplicates/ignore",
  asyncHandler(async (req, res) => {
    const payload = duplicateActionSchema.parse(req.body);
    const data = await ignoreDuplicatePair(req.user.id, payload);
    res.json({ data });
  })
);

contactsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const payload = contactUpdateSchema.parse(req.body);
    const data = await updateContact(req.user.id, req.params.id, payload);
    if (!data) return res.status(404).json({ error: "Contact not found" });
    res.json({ data });
  })
);

contactsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const deleted = await deleteContact(req.user.id, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Contact not found" });
    res.status(204).send();
  })
);

contactsRouter.post(
  "/:id/intelligence",
  asyncHandler(async (req, res) => {
    const contact = await getContact(req.user.id, req.params.id);
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    const data = await generateConnectionIntelligence(contact);
    res.json({ data });
  })
);
