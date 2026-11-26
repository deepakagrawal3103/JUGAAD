import { redirect } from "next/navigation";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { UserRole, UserStatus } from "@/types/database";

export interface AuthenticatedContext {
  userId: string;
  accessToken: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  fullName: string;
  sellerProfileId: string | null;
}

export async function getCurrentSessionUser(): Promise<AuthenticatedContext | null> {
  if (!isSupabaseServerConfigured()) return null;

  const supabase = await createServerSupabase();
  const [{ data: { user } }, { data: { session } }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);

  if (!user || !session?.access_token) return null;

  const [{ data: userRow }, { data: profile }, { data: seller }] = await Promise.all([
    supabase.from("users").select("role, status, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
    supabase.from("seller_profiles").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!userRow || userRow.status === "SUSPENDED") return null;

  return {
    userId: user.id,
    accessToken: session.access_token,
    email: userRow.email || user.email || "",
    role: (userRow.role as UserRole) || "CUSTOMER",
    status: (userRow.status as UserStatus) || "ACTIVE",
    fullName: profile?.full_name || user.email?.split("@")[0] || "Member",
    sellerProfileId: seller?.id ?? null,
  };
}

export async function requireAuth(redirectTo = "/login"): Promise<AuthenticatedContext> {
  const ctx = await getCurrentSessionUser();
  if (!ctx) redirect(redirectTo);
  return ctx;
}

export async function requireSeller(): Promise<AuthenticatedContext> {
  const ctx = await requireAuth("/login?redirect=/seller");
  if (ctx.role !== "SELLER" && ctx.role !== "ADMIN") redirect("/seller/apply");
  if (!ctx.sellerProfileId && ctx.role !== "ADMIN") redirect("/seller/apply");
  return ctx;
}

export async function requireAdmin(): Promise<AuthenticatedContext> {
  const ctx = await requireAuth("/login?redirect=/admin");
  if (ctx.role !== "ADMIN") redirect("/");
  return ctx;
}
