import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

const supabaseAdmin =
  env.supabaseUrl && env.supabaseServiceRoleKey
    ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
    : null;

export async function attachUser(req, _res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!token || !supabaseAdmin) {
    req.user = {
      id: "demo-user",
      email: "demo@reconnect.ai",
      mode: "demo",
      role: "admin",
      plan: "superior"
    };
    return next();
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    req.user = { id: "demo-user", email: "demo@reconnect.ai", mode: "demo" };
    return next();
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
    mode: "supabase",
    name: data.user.user_metadata?.name || data.user.user_metadata?.full_name,
    avatarUrl: data.user.user_metadata?.avatar_url,
    provider: data.user.app_metadata?.provider || "email",
    role: data.user.app_metadata?.role || data.user.user_metadata?.role || "standard",
    plan: data.user.app_metadata?.plan || data.user.user_metadata?.plan || "standard"
  };
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        error: "Forbidden",
        requiredRoles: roles,
        currentRole: req.user?.role || "visitor"
      });
    }
    return next();
  };
}
