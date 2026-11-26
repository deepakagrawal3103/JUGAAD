import type { NextFunction, Request, Response } from "express";
import { getServiceSupabase } from "../lib/supabase.js";
import { isSupabaseConfigured } from "../config/env.js";
import type { AuthUserContext, UserRole, UserStatus } from "../types/domain.js";

export interface AuthenticatedRequest extends Request {
  auth?: AuthUserContext;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isSupabaseConfigured()) {
    res.status(503).json({ error: "Backend Supabase credentials are not configured." });
    return;
  }

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    res.status(401).json({ error: "Authentication token required." });
    return;
  }

  const supabase = getServiceSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired session token." });
    return;
  }

  const [{ data: userRow }, { data: profile }, { data: seller }] = await Promise.all([
    supabase.from("users").select("role, status, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
    supabase.from("seller_profiles").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!userRow || userRow.status === "SUSPENDED") {
    res.status(403).json({ error: "Account is suspended or inactive." });
    return;
  }

  req.auth = {
    userId: user.id,
    email: userRow.email || user.email || "",
    role: (userRow.role as UserRole) || "CUSTOMER",
    status: (userRow.status as UserStatus) || "ACTIVE",
    fullName: profile?.full_name || user.email?.split("@")[0] || "Member",
    sellerProfileId: seller?.id ?? null,
  };

  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({ error: "Forbidden: insufficient role permissions." });
      return;
    }
    next();
  };
}
