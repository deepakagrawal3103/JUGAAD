import { Router } from "express";
import { aggregateBookingPricing, calculateItemPricing } from "../domain/pricing.js";
import { getServiceSupabase } from "../lib/supabase.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import type { FulfillmentType } from "../types/domain.js";
import { cartItemSchema } from "../validators/schemas.js";

export const cartRouter = Router();

cartRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const supabase = getServiceSupabase();
  const [{ data: cart }, { data: settings }] = await Promise.all([
    supabase.from("carts").select("id").eq("user_id", req.auth!.userId).maybeSingle(),
    supabase
      .from("admin_settings")
      .select("commission_percent, reservation_hold_minutes")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (!cart) {
    res.json({ items: [], summary: null, holdMinutes: settings?.reservation_hold_minutes ?? 20 });
    return;
  }

  const { data: rawItems, error } = await supabase
    .from("cart_items")
    .select(`
      id, product_id, start_date, end_date, fulfillment_type,
      product:products(
        id, title, slug, brand, size, city, daily_price, security_deposit,
        min_rental_days, max_rental_days, duration_pricing, fulfillment_options,
        status, is_active, seller_id,
        images:product_images(public_url, is_primary, sort_order)
      )
    `)
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const commissionPercent = Number(settings?.commission_percent ?? 30);
  const enriched = await Promise.all(
    (rawItems ?? []).map(async (row) => {
      const prod = (Array.isArray(row.product) ? row.product[0] : row.product) as {
        id: string;
        title: string;
        slug: string;
        brand: string;
        size: string;
        city: string;
        daily_price: number;
        security_deposit: number;
        duration_pricing: [];
        fulfillment_options: { delivery_fee?: number };
        status: string;
        is_active: boolean;
      } | null;

      if (!prod) return null;

      const { data: avail } = await supabase.rpc("check_product_availability", {
        p_product_id: prod.id,
        p_start_date: row.start_date,
        p_end_date: row.end_date,
      });

      const pricing = calculateItemPricing({
        dailyPrice: Number(prod.daily_price),
        securityDeposit: Number(prod.security_deposit),
        startDate: row.start_date,
        endDate: row.end_date,
        commissionPercent,
        fulfillmentType: row.fulfillment_type as FulfillmentType,
        fulfillmentOptions: prod.fulfillment_options,
        durationPricing: prod.duration_pricing,
      });

      return {
        ...row,
        product: prod,
        availability: avail ?? { available: false, reason: "Unable to verify" },
        pricing,
      };
    })
  );

  const validItems = enriched.filter((x): x is NonNullable<typeof x> => x !== null);
  const summary = aggregateBookingPricing(validItems.map((i) => i.pricing));

  res.json({
    items: validItems,
    summary,
    holdMinutes: settings?.reservation_hold_minutes ?? 20,
  });
});

cartRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = cartItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid cart item." });
    return;
  }

  const { product_id, start_date, end_date, fulfillment_type } = parsed.data;
  const supabase = getServiceSupabase();

  const { data: product } = await supabase
    .from("products")
    .select("id, seller_id, status, is_active")
    .eq("id", product_id)
    .maybeSingle();

  if (!product || product.status !== "APPROVED" || !product.is_active) {
    res.status(404).json({ error: "Listing is not available for rental." });
    return;
  }

  if (req.auth!.sellerProfileId && product.seller_id === req.auth!.sellerProfileId) {
    res.status(400).json({ error: "You cannot rent your own listing." });
    return;
  }

  const { data: avail } = await supabase.rpc("check_product_availability", {
    p_product_id: product_id,
    p_start_date: start_date,
    p_end_date: end_date,
  });

  if (!avail?.available) {
    res.status(409).json({ error: avail?.reason || "Selected dates are unavailable." });
    return;
  }

  let { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", req.auth!.userId)
    .maybeSingle();

  if (!cart) {
    const { data: created } = await supabase
      .from("carts")
      .insert({ user_id: req.auth!.userId })
      .select("id")
      .single();
    cart = created;
  }

  if (!cart) {
    res.status(500).json({ error: "Could not access cart." });
    return;
  }

  const { error } = await supabase.from("cart_items").upsert(
    { cart_id: cart.id, product_id, start_date, end_date, fulfillment_type },
    { onConflict: "cart_id,product_id" }
  );

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ success: true });
});

cartRouter.delete("/:itemId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const supabase = getServiceSupabase();
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", req.auth!.userId)
    .maybeSingle();

  if (cart) {
    await supabase
      .from("cart_items")
      .delete()
      .eq("id", req.params.itemId)
      .eq("cart_id", cart.id);
  }
  res.json({ deleted: true });
});
