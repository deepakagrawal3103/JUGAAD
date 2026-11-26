import "dotenv/config";

export const ENV = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  brandName: process.env.BRAND_NAME || "ClosetLoop",
  brandTagline: process.env.BRAND_TAGLINE || "Your next look doesn't have to be yours.",
  timezone: "Asia/Kolkata",
  currencyCode: "INR",
  currencySymbol: "₹",
  defaultCommissionPercent: 30,
  defaultReservationHoldMinutes: 20,
  defaultCleaningBufferDays: 1,
  maxImageSizeBytes: 5 * 1024 * 1024,
  allowedImageMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    ENV.supabaseUrl &&
      ENV.supabaseAnonKey &&
      ENV.supabaseServiceRoleKey &&
      !ENV.supabaseUrl.includes("your-project-ref")
  );
}
