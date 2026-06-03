import express from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { bootstrapProfile, upsertPushSubscription } from "./auth.repository.js";
import { pushSubscriptionSchema } from "./auth.schemas.js";

export const authRouter = express.Router();

authRouter.post(
  "/bootstrap",
  asyncHandler(async (req, res) => {
    const data = await bootstrapProfile(
      {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        avatarUrl: req.user.avatarUrl,
        provider: req.user.provider || req.user.mode,
        role: req.user.role,
        plan: req.user.plan
      },
      req.headers["user-agent"] || ""
    );
    res.status(201).json({ data });
  })
);

authRouter.post(
  "/push-subscriptions",
  asyncHandler(async (req, res) => {
    const payload = pushSubscriptionSchema.parse(req.body);
    const data = await upsertPushSubscription(req.user.id, payload, req.headers["user-agent"] || "");
    res.status(201).json({ data });
  })
);
