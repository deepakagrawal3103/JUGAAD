import "dotenv/config";

export const ENV = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  brandName: process.env.BRAND_NAME || "RentKro",
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

if (ENV.nodeEnv === "production") {
  const corsOrigins = ENV.corsOrigin.split(",").map((origin) => origin.trim());
  const invalidCorsOrigin = corsOrigins.some((origin) => {
    try {
      const parsed = new URL(origin);
      return parsed.protocol !== "https:" || parsed.origin !== origin;
    } catch {
      return true;
    }
  });
  if (
    !process.env.CORS_ORIGIN ||
    corsOrigins.length === 0 ||
    invalidCorsOrigin ||
    corsOrigins.some((origin) => origin === "*" || /localhost|127\.0\.0\.1/i.test(origin))
  ) {
    throw new Error("CORS_ORIGIN must contain the exact production frontend origin(s).");
  }
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey || !ENV.supabaseServiceRoleKey) {
    throw new Error("Supabase server environment variables must be configured in production.");
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    ENV.supabaseUrl &&
      ENV.supabaseAnonKey &&
      ENV.supabaseServiceRoleKey &&
      !ENV.supabaseUrl.includes("your-project-ref")
  );
}
