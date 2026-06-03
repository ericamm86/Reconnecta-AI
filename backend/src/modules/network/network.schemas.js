import { z } from "zod";

export const publicProfileSchema = z.object({
  isActive: z.boolean().default(false),
  displayName: z.string().min(2),
  headline: z.string().max(120).optional().or(z.literal("")),
  bio: z.string().max(600).optional().or(z.literal("")),
  company: z.string().max(120).optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  tags: z.array(z.string().min(1)).default([]),
  visibility: z.enum(["hidden", "network", "public"]).default("network")
});

export const groupSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(500).optional().or(z.literal("")),
  visibility: z.enum(["private", "invite_only", "organization"]).default("private")
});

export const groupMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member")
});

export const groupCustomFieldSchema = z.object({
  key: z
    .string()
    .min(2)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Use a stable camelCase or snake_case key"),
  label: z.string().min(2),
  type: z.enum(["text", "number", "date", "select", "boolean"]).default("text"),
  options: z.array(z.string()).default([]),
  required: z.boolean().default(false)
});
