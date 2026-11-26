import { BRAND_CONFIG } from "@/config/brand";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function getApiUrl(path: string): string {
  const base = BRAND_CONFIG.apiBaseUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) {
    throw new Error("Marketplace API is not configured. Set NEXT_PUBLIC_API_URL in the deployment environment.");
  }
  return `${base}${cleanPath}`;
}

/**
 * Browser-side authenticated API client talking directly to the standalone backend service.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);

  if (typeof window !== "undefined" && isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
  }

  return fetch(getApiUrl(path), {
    ...init,
    headers,
  });
}

/**
 * Server-side API client used by Next.js Server Components with an explicit Bearer token.
 */
export async function serverApiFetch(
  path: string,
  accessToken?: string | null,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return fetch(getApiUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });
}
