import { Router } from "express";
import { z } from "zod";
import { getServiceSupabase } from "../lib/supabase.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const wishlistRouter = Router();
const toggleSchema = z.object({ product_id: z.string().uuid() });

wishlistRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const supabase = getServiceSupabase();
  const { data: wishlist } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", req.auth!.userId)
    .maybeSingle();

  if (!wishlist) {
    res.json({ items: [] });
    return;
  }

  const { data: items, error } = await supabase
    .from("wishlist_items")
    .select(`
      id,
      product_id,
      product:products(
        *,
        category:categories(id, name, slug),
        images:product_images(id, storage_path, public_url, sort_order, is_primary),
        seller:seller_profiles(id, display_name, city, locality, verification_status, total_rentals, rating_avg)
      )
    `)
    .eq("wishlist_id", wishlist.id)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const approvedItems = (items ?? []).filter((row) => {
    const prod = (Array.isArray(row.product) ? row.product[0] : row.product) as {
      status?: string;
      is_active?: boolean;
    } | null;
    return Boolean(prod && prod.status === "APPROVED" && prod.is_active);
  });

  res.json({ items: approvedItems });
});

wishlistRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = toggleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid product ID." });
    return;
  }

  const supabase = getServiceSupabase();
  let { data: wishlist } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", req.auth!.userId)
    .maybeSingle();

  if (!wishlist) {
    const { data: created } = await supabase
      .from("wishlists")
      .insert({ user_id: req.auth!.userId })
      .select("id")
      .single();
    wishlist = created;
  }

  if (!wishlist) {
    res.status(500).json({ error: "Could not access wishlist." });
    return;
  }

  const { data: existing } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("wishlist_id", wishlist.id)
    .eq("product_id", parsed.data.product_id)
    .maybeSingle();

  if (existing) {
    await supabase.from("wishlist_items").delete().eq("id", existing.id);
    res.json({ wishlisted: false });
    return;
  }

  const { error } = await supabase.from("wishlist_items").insert({
    wishlist_id: wishlist.id,
    product_id: parsed.data.product_id,
  });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ wishlisted: true });
});
