import { z } from "zod";

const emptyString = z.literal("");

export const contactSchema = z.object({
  name: z.string().min(2),
  avatarUrl: z.string().url().optional().or(emptyString),
  description: z.string().optional().or(emptyString),
  email: z.string().email().optional().or(emptyString),
  emails: z.array(z.string().email()).default([]),
  phones: z.array(z.string().min(6)).default([]),
  company: z.string().min(1).optional().or(emptyString),
  role: z.string().min(1).optional().or(emptyString),
  area: z.string().min(1).optional().or(emptyString),
  proximity: z.coerce.number().int().min(0).max(100).default(50),
  tags: z.array(z.string()).default([]),
  sourceOrigin: z.enum(["google_contacts", "csv", "manual", "apple_contacts", "outlook", "linkedin_export", "other"]).default("manual"),
  socialLinks: z
    .object({
      whatsapp: z.string().url().optional().or(emptyString),
      instagram: z.string().url().optional().or(emptyString),
      linkedin: z.string().url().optional().or(emptyString),
      custom: z.string().url().optional().or(emptyString)
    })
    .partial()
    .default({}),
  currentDemand: z.string().optional().or(emptyString),
  problemSolved: z.string().optional().or(emptyString),
  internalNotes: z.string().default(""),
  recordScopes: z
    .array(z.enum(["INTERNAL_PRIVATE", "PUBLIC_PLATFORM_PROFILE", "GROUP_CONTACT"]))
    .default(["INTERNAL_PRIVATE"]),
  customValues: z.record(z.string(), z.unknown()).default({})
});

export const contactUpdateSchema = contactSchema.partial();

export const contactImportSchema = z.object({
  source: z.enum(["google_contacts", "csv", "manual", "apple_contacts", "outlook", "linkedin_export", "other"]).default("csv"),
  rows: z.array(contactSchema).default([])
});

export const googleContactsImportSchema = z.object({
  accessToken: z.string().min(12)
});

export const duplicateActionSchema = z.object({
  leftContactId: z.string().min(1),
  rightContactId: z.string().min(1),
  reason: z.string().optional().default("")
});
