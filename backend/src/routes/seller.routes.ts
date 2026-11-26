import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { ENV } from "../config/env.js";
import { canRoleSetListingStatus } from "../domain/state-machine.js";
import { getServiceSupabase } from "../lib/supabase.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import type { ListingStatus } from "../types/domain.js";
import { listingPayloadSchema, sellerApplySchema } from "../validators/schemas.js";

export const sellerRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ENV.maxImageSizeBytes },
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

sellerRouter.post("/apply", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = sellerApplySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid seller details." });
    return;
  }

  const supabase = getServiceSupabase();
  const { data: existing } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("user_id", req.auth!.userId)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from("seller_profiles")
      .update({
        display_name: parsed.data.display_name,
        bio: parsed.data.bio || null,
        city: parsed.data.city,
        state: parsed.data.state || null,
        locality: parsed.data.locality || null,
        pickup_address: parsed.data.pickup_address,
        payout_upi_id: parsed.data.payout_upi_id,
        payout_account_name: parsed.data.payout_account_name,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ seller: updated });
    return;
  }

  const { data: created, error } = await supabase
    .from("seller_profiles")
    .insert({
      user_id: req.auth!.userId,
      display_name: parsed.data.display_name,
      bio: parsed.data.bio || null,
      city: parsed.data.city,
      state: parsed.data.state || null,
      locality: parsed.data.locality || null,
      pickup_address: parsed.data.pickup_address,
      payout_upi_id: parsed.data.payout_upi_id,
      payout_account_name: parsed.data.payout_account_name,
      verification_status: "APPROVED",
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (req.auth!.role === "CUSTOMER") {
    await supabase.from("users").update({ role: "SELLER" }).eq("id", req.auth!.userId);
  }

  await supabase.from("notifications").insert({
    user_id: req.auth!.userId,
    type: "SELLER_ONBOARDED",
    title: "Seller Studio Activated",
    body: "Your closet profile is active. Submit your first outfit for admin review.",
    link: "/seller/listings/new",
  });

  res.status(201).json({ seller: created });
});

sellerRouter.get(
  "/dashboard",
  requireAuth,
  requireRole("SELLER", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    if (!req.auth!.sellerProfileId && req.auth!.role !== "ADMIN") {
      res.status(403).json({ error: "Complete seller onboarding first." });
      return;
    }

    const supabase = getServiceSupabase();
    const sellerId = req.auth!.sellerProfileId;

    if (!sellerId) {
      res.json({ listings: [], bookingItems: [], payouts: [] });
      return;
    }

    const [{ data: listings }, { data: bookingItems }, { data: payouts }] = await Promise.all([
      supabase
        .from("products")
        .select("*, images:product_images(public_url, is_primary)")
        .eq("seller_id", sellerId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("booking_items")
        .select(`
          id, booking_id, product_title_snapshot, start_date, end_date,
          rental_amount, commission_amount, seller_earnings, fulfillment_type, return_deadline,
          booking:bookings(id, booking_reference, status, payment_status)
        `)
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("seller_payouts")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false }),
    ]);

    const normalizedItems = (bookingItems ?? []).map((bi) => ({
      ...bi,
      booking: Array.isArray(bi.booking) ? bi.booking[0] ?? null : bi.booking,
    }));

    res.json({
      listings: listings ?? [],
      bookingItems: normalizedItems,
      payouts: payouts ?? [],
    });
  }
);

sellerRouter.post(
  "/upload-image",
  requireAuth,
  requireRole("SELLER", "ADMIN"),
  rateLimit("upload", 30, 60_000),
  upload.single("file"),
  async (req: AuthenticatedRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Image file is required." });
      return;
    }
    if (!ENV.allowedImageMimeTypes.includes(file.mimetype as "image/jpeg" | "image/png" | "image/webp")) {
      res.status(400).json({ error: "Upload JPEG, PNG, or WebP images only." });
      return;
    }

    const ext = file.mimetype === "image/png" ? "png" : file.mimetype === "image/webp" ? "webp" : "jpg";
    const storagePath = `${req.auth!.userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const supabase = getServiceSupabase();

    const { error } = await supabase.storage
      .from("product-images")
      .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(storagePath);
    res.json({ storage_path: storagePath, public_url: urlData.publicUrl });
  }
);

sellerRouter.get(
  "/listings/:id",
  requireAuth,
  requireRole("SELLER", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    const supabase = getServiceSupabase();
    const { data: product } = await supabase
      .from("products")
      .select("*, images:product_images(*)")
      .eq("id", String(req.params.id))
      .maybeSingle();

    if (!product) {
      res.status(404).json({ error: "Listing not found." });
      return;
    }
    if (req.auth!.role !== "ADMIN" && product.seller_id !== req.auth!.sellerProfileId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json({ product });
  }
);

sellerRouter.post(
  "/listings",
  requireAuth,
  requireRole("SELLER", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    if (!req.auth!.sellerProfileId) {
      res.status(403).json({ error: "Complete seller onboarding first." });
      return;
    }

    const parsed = listingPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid listing data." });
      return;
    }

    const data = parsed.data;
    if (data.max_rental_days < data.min_rental_days) {
      res.status(400).json({ error: "Maximum rental days must be >= minimum rental days." });
      return;
    }
    if (data.submit_for_review && data.images.length < 1) {
      res.status(400).json({ error: "Upload at least 1 product image before submitting." });
      return;
    }

    const initialStatus = data.submit_for_review ? "PENDING_REVIEW" : "DRAFT";
    const uniqueSlug = `${slugify(data.title)}-${crypto.randomUUID().slice(0, 6)}`;
    const supabase = getServiceSupabase();

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        seller_id: req.auth!.sellerProfileId,
        category_id: data.category_id,
        subcategory: data.subcategory || null,
        title: data.title,
        slug: uniqueSlug,
        brand: data.brand,
        description: data.description,
        size: data.size,
        color: data.color,
        gender_style: data.gender_style,
        occasion: data.occasion,
        condition: data.condition,
        fabric: data.fabric || null,
        original_retail_price: data.original_retail_price ?? null,
        daily_price: data.daily_price,
        security_deposit: data.security_deposit,
        min_rental_days: data.min_rental_days,
        max_rental_days: data.max_rental_days,
        duration_pricing: data.duration_pricing,
        late_fee_per_day: data.late_fee_per_day,
        quantity: data.quantity,
        fulfillment_options: data.fulfillment_options,
        city: data.city,
        locality: data.locality || null,
        status: initialStatus,
        is_active: true,
      })
      .select()
      .single();

    if (error || !product) {
      res.status(500).json({ error: error?.message || "Failed to create listing." });
      return;
    }

    if (data.images.length > 0) {
      await supabase.from("product_images").insert(
        data.images.map((img, idx) => ({
          product_id: product.id,
          storage_path: img.storage_path,
          public_url: img.public_url,
          angle_tag: img.angle_tag || null,
          sort_order: img.sort_order ?? idx,
          is_primary: idx === 0 ? true : Boolean(img.is_primary),
        }))
      );
    }

    await supabase.from("product_availability").insert({
      product_id: product.id,
      available_from: data.available_from || null,
      available_until: data.available_until || null,
      currently_in_use: Boolean(data.currently_in_use),
    });

    if (data.blocked_ranges.length > 0) {
      await supabase.from("blocked_dates").insert(
        data.blocked_ranges.map((r) => ({
          product_id: product.id,
          start_date: r.start_date,
          end_date: r.end_date,
          reason: r.reason || "Seller blocked",
          created_by: req.auth!.userId,
        }))
      );
    }

    if (initialStatus === "PENDING_REVIEW") {
      await supabase.from("listing_review_logs").insert({
        product_id: product.id,
        reviewer_id: req.auth!.userId,
        action: "SUBMITTED",
        previous_status: "DRAFT",
        new_status: "PENDING_REVIEW",
        notes: "Submitted by seller for admin review.",
      });
    }

    res.status(201).json({ product });
  }
);

sellerRouter.patch(
  "/listings/:id",
  requireAuth,
  requireRole("SELLER", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    const listingId = String(req.params.id);
    const supabase = getServiceSupabase();
    const { data: existing } = await supabase
      .from("products")
      .select("*")
      .eq("id", listingId)
      .maybeSingle();

    if (!existing) {
      res.status(404).json({ error: "Listing not found." });
      return;
    }
    const isOwner = req.auth!.sellerProfileId && existing.seller_id === req.auth!.sellerProfileId;
    if (!isOwner && req.auth!.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (req.body && typeof req.body.action_status === "string") {
      const targetStatus = req.body.action_status as ListingStatus;
      if (!canRoleSetListingStatus(req.auth!.role, existing.status as ListingStatus, targetStatus)) {
        res.status(403).json({ error: "You are not permitted to perform this status transition." });
        return;
      }
      const { data: updated, error } = await supabase
        .from("products")
        .update({ status: targetStatus })
        .eq("id", listingId)
        .select()
        .single();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.json({ product: updated });
      return;
    }

    const parsed = listingPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid listing payload." });
      return;
    }

    const data = parsed.data;
    const nextStatus: ListingStatus = data.submit_for_review
      ? "PENDING_REVIEW"
      : existing.status === "APPROVED"
      ? "PENDING_REVIEW"
      : "DRAFT";
    const resolvedStatus = req.auth!.role === "ADMIN" ? existing.status : nextStatus;

    const { data: updated, error } = await supabase
      .from("products")
      .update({
        category_id: data.category_id,
        subcategory: data.subcategory || null,
        title: data.title,
        brand: data.brand,
        description: data.description,
        size: data.size,
        color: data.color,
        gender_style: data.gender_style,
        occasion: data.occasion,
        condition: data.condition,
        fabric: data.fabric || null,
        original_retail_price: data.original_retail_price ?? null,
        daily_price: data.daily_price,
        security_deposit: data.security_deposit,
        min_rental_days: data.min_rental_days,
        max_rental_days: data.max_rental_days,
        duration_pricing: data.duration_pricing,
        late_fee_per_day: data.late_fee_per_day,
        quantity: data.quantity,
        fulfillment_options: data.fulfillment_options,
        city: data.city,
        locality: data.locality || null,
        status: resolvedStatus,
      })
      .eq("id", listingId)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (data.images.length > 0) {
      await supabase.from("product_images").delete().eq("product_id", listingId);
      await supabase.from("product_images").insert(
        data.images.map((img, idx) => ({
          product_id: listingId,
          storage_path: img.storage_path,
          public_url: img.public_url,
          angle_tag: img.angle_tag || null,
          sort_order: img.sort_order ?? idx,
          is_primary: idx === 0 ? true : Boolean(img.is_primary),
        }))
      );
    }

    res.json({ product: updated });
  }
);

sellerRouter.delete(
  "/listings/:id",
  requireAuth,
  requireRole("SELLER", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    const listingId = String(req.params.id);
    const supabase = getServiceSupabase();
    const { data: existing } = await supabase
      .from("products")
      .select("id, seller_id")
      .eq("id", listingId)
      .maybeSingle();

    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const isOwner = req.auth!.sellerProfileId && existing.seller_id === req.auth!.sellerProfileId;
    if (!isOwner && req.auth!.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { count } = await supabase
      .from("booking_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", listingId);

    if ((count ?? 0) > 0) {
      await supabase
        .from("products")
        .update({ status: "ARCHIVED", is_active: false })
        .eq("id", listingId);
      res.json({ archived: true });
      return;
    }

    await supabase.from("products").delete().eq("id", listingId);
    res.json({ deleted: true });
  }
);

const blockSchema = z.object({
  product_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(160).optional(),
});

sellerRouter.post(
  "/blocked-dates",
  requireAuth,
  requireRole("SELLER", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    const parsed = blockSchema.safeParse(req.body);
    if (!parsed.success || parsed.data.end_date < parsed.data.start_date) {
      res.status(400).json({ error: "Invalid blocked date range." });
      return;
    }
    const supabase = getServiceSupabase();
    const { data: prod } = await supabase
      .from("products")
      .select("id, seller_id")
      .eq("id", parsed.data.product_id)
      .maybeSingle();

    if (!prod || (req.auth!.role !== "ADMIN" && prod.seller_id !== req.auth!.sellerProfileId)) {
      res.status(404).json({ error: "Listing not found." });
      return;
    }

    const { data, error } = await supabase
      .from("blocked_dates")
      .insert({
        product_id: parsed.data.product_id,
        start_date: parsed.data.start_date,
        end_date: parsed.data.end_date,
        reason: parsed.data.reason || "Seller unavailable",
        created_by: req.auth!.userId,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json({ blocked: data });
  }
);
