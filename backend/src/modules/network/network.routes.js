import express from "express";
import { requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  buildUserContext,
  createGroup,
  createGroupCustomField,
  deleteGroup,
  getGroup,
  getPublicProfile,
  inviteGroupMember,
  listDirectory,
  listGroups,
  removeGroupMember,
  updateGroup,
  upsertPublicProfile
} from "./network.repository.js";
import { groupCustomFieldSchema, groupMemberSchema, groupSchema, publicProfileSchema } from "./network.schemas.js";

export const networkRouter = express.Router();

networkRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    res.json({ data: buildUserContext(req.user) });
  })
);

networkRouter.get(
  "/public-profile",
  asyncHandler(async (req, res) => {
    const data = await getPublicProfile(req.user.id);
    res.json({ data });
  })
);

networkRouter.put(
  "/public-profile",
  asyncHandler(async (req, res) => {
    const payload = publicProfileSchema.parse(req.body);
    const data = await upsertPublicProfile(req.user.id, payload);
    res.json({ data });
  })
);

networkRouter.get(
  "/directory",
  asyncHandler(async (req, res) => {
    const data = await listDirectory(req.query);
    res.json({ data });
  })
);

networkRouter.get(
  "/groups",
  asyncHandler(async (req, res) => {
    const data = await listGroups(req.user);
    res.json({ data });
  })
);

networkRouter.post(
  "/groups",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = groupSchema.parse(req.body);
    const data = await createGroup(req.user.id, payload);
    res.status(201).json({ data });
  })
);

networkRouter.get(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const data = await getGroup(req.user, req.params.id);
    if (!data) return res.status(404).json({ error: "Group not found" });
    res.json({ data });
  })
);

networkRouter.put(
  "/groups/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = groupSchema.partial().parse(req.body);
    const data = await updateGroup(req.user, req.params.id, payload);
    if (!data) return res.status(404).json({ error: "Group not found" });
    res.json({ data });
  })
);

networkRouter.delete(
  "/groups/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const deleted = await deleteGroup(req.user, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Group not found" });
    res.status(204).send();
  })
);

networkRouter.post(
  "/groups/:id/members",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = groupMemberSchema.parse(req.body);
    const data = await inviteGroupMember(req.user, req.params.id, payload);
    if (!data) return res.status(404).json({ error: "Group not found" });
    res.status(201).json({ data });
  })
);

networkRouter.delete(
  "/groups/:id/members/:memberId",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const deleted = await removeGroupMember(req.user, req.params.id, req.params.memberId);
    if (!deleted) return res.status(404).json({ error: "Group member not found" });
    res.status(204).send();
  })
);

networkRouter.post(
  "/groups/:id/custom-fields",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = groupCustomFieldSchema.parse(req.body);
    const data = await createGroupCustomField(req.user, req.params.id, payload);
    if (!data) return res.status(404).json({ error: "Group not found" });
    res.status(201).json({ data });
  })
);
