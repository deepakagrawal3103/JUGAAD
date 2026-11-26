import { Router } from "express";
import { z } from "zod";
import { ENV, isSupabaseConfigured } from "../config/env.js";
import { calculateItemPricing } from "../domain/pricing.js";
import { getAnonSupabase, getServiceSupabase } from "../lib/supabase.js";
import type { FulfillmentType } from "../types/domain.js";

export const catalogRouter = Router();

const FALLBACK_SETTINGS = {
  id: 1,
  brand_name: ENV.brandName,
  brand_tagline: ENV.brandTagline,
  commission_percent: ENV.defaultCommissionPercent,
  reservation_hold_minutes: ENV.defaultReservationHoldMinutes,
  cleaning_buffer_days: ENV.defaultCleaningBufferDays,
  late_fee_grace_hours: 4,
  late_fee_policy_summary:
    "3-Day Rental Policy: Aap event se 1 din pehle outfit pehen sakte hain aur 3rd day return karna zaroori hai. 3rd day ke baad har extra day par rent amount ka 30% late fee lagega.",
  upi_id: "",
  upi_display_name: `${ENV.brandName} Rentals`,
  upi_qr_url: "",
  whatsapp_number: "",
  payment_instructions:
    "Scan the QR code or copy the UPI ID above to pay the exact total. Submit your UTR reference and screenshot below.",
};

catalogRouter.get("/shell", async (_req, res) => {
  if (!isSupabaseConfigured()) {
    res.json({ configured: false, settings: FALLBACK_SETTINGS, categories: [], banners: [] });
    return;
  }
  const supabase = getServiceSupabase();
  const [{ data: settings }, { data: categories }, { data: banners }] = await Promise.all([
    supabase.from("admin_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("categories").select("*").eq("is_active", true).order("display_order"),
    supabase.from("banners").select("*").eq("is_active", true).order("display_order"),
  ]);

  res.json({
    configured: true,
    settings: settings ?? FALLBACK_SETTINGS,
    categories: categories ?? [],
    banners: banners ?? [],
  });
});

catalogRouter.get("/categories", async (_req, res) => {
  if (!isSupabaseConfigured()) {
    res.json({ categories: [] });
    return;
  }
  const supabase = getServiceSupabase();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  res.json({ categories: categories ?? [] });
});

catalogRouter.get("/products", async (req, res) => {
  if (!isSupabaseConfigured()) {
    res.json({ items: [], total: 0, page: 1, totalPages: 1 });
    return;
  }

  const sp = req.query;
  const q = String(sp.q || "").trim();
  const categorySlug = String(sp.category || "").trim();
  const subcategory = String(sp.subcategory || "").trim();
  const size = String(sp.size || "").trim();
  const genderStyle = String(sp.gender_style || "").trim();
  const occasion = String(sp.occasion || "").trim();
  const color = String(sp.color || "").trim();
  const location = String(sp.location || "").trim();
  const condition = String(sp.condition || "").trim();
  const minPrice = Number(sp.min_price || 0);
  const maxPrice = Number(sp.max_price || 0);
  const duration = Number(sp.duration || 0);
  const startDate = String(sp.start_date || "").trim();
  const endDate = String(sp.end_date || "").trim();
  const sort = String(sp.sort || "recommended");
  const featuredOnly = sp.featured === "true";
  const trendingOnly = sp.trending === "true";
  const page = Math.max(1, Number(sp.page || 1));
  const limit = Math.min(48, Math.max(1, Number(sp.limit || 16)));

  const supabase = getAnonSupabase();

  let categoryId: string | null = null;
  if (categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (!cat) {
      res.json({ items: [], total: 0, page, totalPages: 1 });
      return;
    }
    categoryId = cat.id;
  }

  let query = supabase
    .from("products")
    .select(
      `
      *,
      category:categories(id, name, slug),
      images:product_images(id, product_id, storage_path, public_url, angle_tag, sort_order, is_primary),
      seller:seller_profiles(id, display_name, city, locality, verification_status, total_rentals, rating_avg)
    `,
      { count: "exact" }
    )
    .eq("status", "APPROVED")
    .eq("is_active", true);

  if (q) {
    const safeQ = q.replace(/[%_,]/g, "");
    query = query.or(`title.ilike.%${safeQ}%,brand.ilike.%${safeQ}%`);
  }
  if (categoryId) query = query.eq("category_id", categoryId);
  if (subcategory) query = query.ilike("subcategory", `%${subcategory}%`);
  if (size) query = query.eq("size", size);
  if (genderStyle) query = query.eq("gender_style", genderStyle);
  if (occasion) query = query.eq("occasion", occasion);
  if (color) query = query.ilike("color", `%${color}%`);
  if (location) query = query.ilike("city", `%${location}%`);
  if (condition) query = query.eq("condition", condition);
  if (minPrice > 0) query = query.gte("daily_price", minPrice);
  if (maxPrice > 0) query = query.lte("daily_price", maxPrice);
  if (duration > 0) query = query.lte("min_rental_days", duration).gte("max_rental_days", duration);
  if (featuredOnly) query = query.eq("is_featured", true);
  if (trendingOnly) query = query.eq("is_trending", true);

  switch (sort) {
    case "newly_added":
      query = query.order("created_at", { ascending: false });
      break;
    case "price_asc":
      query = query.order("daily_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("daily_price", { ascending: false });
      break;
    case "most_popular":
      query = query.order("rental_count", { ascending: false });
      break;
    default:
      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
      break;
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) {
    res.status(500).json({ error: "Request could not be completed." });
    return;
  }

  let items = data ?? [];

  // Hide pieces that are currently out on active rent today
  const todayIST = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split("T")[0];
  const { data: activeRentItems } = await supabase
    .from("booking_items")
    .select("product_id, booking:bookings!inner(status)")
    .in("booking.status", ["CONFIRMED", "READY_FOR_PICKUP", "DISPATCHED", "RENTAL_ACTIVE", "RETURN_DUE"])
    .lte("start_date", todayIST)
    .gte("end_date", todayIST);
  const currentlyRentedIds = new Set((activeRentItems ?? []).map((r: { product_id: string }) => r.product_id));
  items = items.filter((item: { id: string }) => !currentlyRentedIds.has(item.id));

  if (startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    const checks = await Promise.all(
      items.map(async (item: { id: string }) => {
        const { data: avail } = await supabase.rpc("check_product_availability", {
          p_product_id: item.id,
          p_start_date: startDate,
          p_end_date: endDate,
        });
        return { id: item.id, ok: Boolean(avail?.available) };
      })
    );
    const okIds = new Set(checks.filter((c) => c.ok).map((c) => c.id));
    items = items.filter((item: { id: string }) => okIds.has(item.id));
  }

  const total = count ?? items.length;
  res.json({ items, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

catalogRouter.get("/products/:slug", async (req, res) => {
  if (!isSupabaseConfigured()) {
    res.status(404).json({ error: "Product not found." });
    return;
  }

  const supabase = getServiceSupabase();
  const { data: product } = await supabase
    .from("products")
    .select(
      `
      *,
      category:categories(id, name, slug),
      images:product_images(id, product_id, storage_path, public_url, angle_tag, sort_order, is_primary),
      seller:seller_profiles(id, display_name, city, locality, verification_status, total_rentals, rating_avg)
    `
    )
    .eq("slug", req.params.slug)
    .eq("status", "APPROVED")
    .eq("is_active", true)
    .maybeSingle();

  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }

  const [{ data: unavailable }, { data: settings }, { data: related }] = await Promise.all([
    supabase.rpc("get_product_unavailable_dates", { p_product_id: product.id }),
    supabase.from("admin_settings").select("cleaning_buffer_days").eq("id", 1).maybeSingle(),
    supabase
      .from("products")
      .select(
        `
        *,
        category:categories(id, name, slug),
        images:product_images(id, product_id, storage_path, public_url, angle_tag, sort_order, is_primary),
        seller:seller_profiles(id, display_name, city, locality, verification_status, total_rentals, rating_avg)
      `
      )
      .eq("status", "APPROVED")
      .eq("is_active", true)
      .eq("category_id", product.category_id)
      .neq("id", product.id)
      .limit(4),
  ]);

  res.json({
    product,
    unavailableDates: unavailable ?? [],
    cleaningBufferDays: settings?.cleaning_buffer_days ?? 1,
    related: related ?? [],
  });
});

const availSchema = z.object({
  product_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fulfillment_type: z
    .enum(["PICKUP", "SELLER_DELIVERY", "PLATFORM_DELIVERY"])
    .optional()
    .default("PICKUP"),
});

catalogRouter.get("/availability", async (req, res) => {
  if (!isSupabaseConfigured()) {
    res.status(503).json({ error: "Database not configured." });
    return;
  }

  const parsed = availSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid availability query." });
    return;
  }

  const supabase = getServiceSupabase();
  const { product_id, start_date, end_date, fulfillment_type } = parsed.data;

  const [{ data: avail, error }, { data: product }, { data: settings }] = await Promise.all([
    supabase.rpc("check_product_availability", {
      p_product_id: product_id,
      p_start_date: start_date,
      p_end_date: end_date,
    }),
    supabase
      .from("products")
      .select("id, daily_price, security_deposit, duration_pricing, fulfillment_options, status, is_active")
      .eq("id", product_id)
      .eq("status", "APPROVED")
      .eq("is_active", true)
      .maybeSingle(),
    supabase.from("admin_settings").select("commission_percent").eq("id", 1).maybeSingle(),
  ]);

  if (error) {
    res.status(500).json({ error: "Request could not be completed." });
    return;
  }
  if (!product) {
    res.status(404).json({ available: false, reason: "Listing unavailable." });
    return;
  }

  let pricing = null;
  if (avail?.available) {
    pricing = calculateItemPricing({
      dailyPrice: Number(product.daily_price),
      securityDeposit: Number(product.security_deposit),
      startDate: start_date,
      endDate: end_date,
      commissionPercent: Number(settings?.commission_percent ?? 30),
      fulfillmentType: fulfillment_type as FulfillmentType,
      fulfillmentOptions: product.fulfillment_options,
      durationPricing: product.duration_pricing,
    });
  }

  res.json({ ...avail, pricing });
});

catalogRouter.get("/policies/:slug", async (req, res) => {
  if (!isSupabaseConfigured()) {
    res.status(404).json({ error: "Policy not found." });
    return;
  }
  const supabase = getAnonSupabase();
  const { data } = await supabase
    .from("policies")
    .select("*")
    .eq("slug", req.params.slug)
    .maybeSingle();

  if (!data) {
    res.status(404).json({ error: "Policy not found." });
    return;
  }
  res.json({ policy: data });
});
