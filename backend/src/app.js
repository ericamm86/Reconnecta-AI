import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { attachUser } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { contactsRouter } from "./modules/contacts/contacts.routes.js";
import { dashboardRouter } from "./modules/dashboard.routes.js";
import { apiV1Router, docsRouter } from "./modules/docs/docs.routes.js";
import { intelligenceRouter } from "./modules/intelligence/intelligence.routes.js";
import { interactionsRouter } from "./modules/interactions/interactions.routes.js";
import { networkRouter } from "./modules/network/network.routes.js";

export function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        const allowed = new Set([env.clientOrigin, "http://localhost:5173", "http://127.0.0.1:5173"]);
        if (!origin || allowed.has(origin)) return callback(null, true);
        return callback(new Error("Origin not allowed by CORS"));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
  app.use(attachUser);

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "Reconnect AI API",
      codename: "Nexus Loom"
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/v1", docsRouter);
  app.use("/api/v1", apiV1Router);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/contacts", contactsRouter);
  app.use("/api/interactions", interactionsRouter);
  app.use("/api/intelligence", intelligenceRouter);
  app.use("/api/network", networkRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
