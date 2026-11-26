import { Router } from "express";
import { z } from "zod";
import { getServiceSupabase } from "../lib/supabase.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { adminPaymentDecisionSchema, adminSettingsSchema } from "../validators/schemas.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("ADMIN"));

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
}

adminRouter.get("/dashboard", async (_req, res) => {
  const supabase = getServiceSupabase();
  const [
    { data: users },
    { data: sellers },
    { data: listings },
    { data: bookings },
    { data: paymentQueue },
    { data: deposits },
    { data: payouts },
    { data: disputes },
    { data: categories },
    { data: policies },
    { data: settings },
  ] = await Promise.all([
    supabase.from("users").select("*").order("created_at", { ascending: false }),
    supabase.from("seller_profiles").select("*, user:users(email, phone, status)").order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select(`
        id, title, brand, daily_price, security_deposit, condition, status, is_featured, is_trending, created_at,
        category:categories(name),
        seller:seller_profiles(display_name, city),
        images:product_images(public_url, is_primary)
      `)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select(`
        id, booking_reference, status, payment_status, total_rental_amount,
        total_commission_amount, total_seller_earnings, total_payable, created_at,
        customer:users(email),
        items:booking_items(product_title_snapshot, start_date, end_date)
      `)
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_proofs")
      .select(`
        id, booking_id, utr_reference, paid_amount, screenshot_path, review_status, created_at,
        booking:bookings(id, booking_reference, total_payable, status, customer:users(email))
      `)
      .order("created_at", { ascending: false }),
    supabase
      .from("security_deposits")
      .select("*, booking:bookings(booking_reference, status)")
      .order("created_at", { ascending: false }),
    supabase
      .from("seller_payouts")
      .select("*, seller:seller_profiles(display_name, payout_upi_id), booking:bookings(booking_reference)")
      .order("created_at", { ascending: false }),
    supabase
      .from("disputes")
      .select("*, booking:bookings(booking_reference)")
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("*").eq("is_active", true).order("display_order"),
    supabase.from("policies").select("*").order("title"),
    supabase.from("admin_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const allListings = listings ?? [];
  const allBookings = bookings ?? [];
  const allDeposits = deposits ?? [];
  const allDisputes = disputes ?? [];
  const allProofs = paymentQueue ?? [];
  const confirmed = allBookings.filter((b) => b.payment_status === "VERIFIED");

  const metrics = {
    totalUsers: (users ?? []).length,
    totalSellers: (sellers ?? []).length,
    activeListings: allListings.filter((l) => l.status === "APPROVED").length,
    pendingListings: allListings.filter((l) => l.status === "PENDING_REVIEW").length,
    totalBookings: allBookings.length,
    confirmedBookings: confirmed.length,
    activeRentals: allBookings.filter((b) => b.status === "RENTAL_ACTIVE").length,
    paymentPendingCount: allProofs.filter((p) => p.review_status === "PENDING").length,
    rentalVolume: confirmed.reduce((s, b) => s + Number(b.total_rental_amount || 0), 0),
    platformCommission: confirmed.reduce((s, b) => s + Number(b.total_commission_amount || 0), 0),
    sellerEarnings: confirmed.reduce((s, b) => s + Number(b.total_seller_earnings || 0), 0),
    refundsPending: allDeposits.filter((d) => d.status === "REFUND_PENDING").length,
    depositsHeld: allDeposits
      .filter((d) => ["HELD", "REFUND_PENDING"].includes(d.status))
      .reduce((s, d) => s + Number(d.amount_held || 0), 0),
    returnsPending: allBookings.filter((b) =>
      ["RETURN_DUE", "RETURN_INITIATED", "RETURNED", "INSPECTION_PENDING"].includes(b.status)
    ).length,
    openDisputes: allDisputes.filter((d) => ["OPEN", "UNDER_REVIEW"].includes(d.status)).length,
  };

  res.json({
    metrics,
    listings: allListings,
    paymentQueue: allProofs,
    bookings: allBookings,
    deposits: allDeposits,
    payouts: payouts ?? [],
    disputes: allDisputes,
    users: users ?? [],
    sellers: sellers ?? [],
    categories: categories ?? [],
    policies: policies ?? [],
    settings,
  });
});

const listingActionSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED", "PAUSED", "UNPUBLISHED"]),
  notes: z.string().max(1000).optional().nullable(),
  is_featured: z.boolean().optional(),
  is_trending: z.boolean().optional(),
});

adminRouter.patch("/listings/:id", async (req: AuthenticatedRequest, res) => {
  const parsed = listingActionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid listing action." });
    return;
  }

  const listingId = String(req.params.id);
  const supabase = getServiceSupabase();
  const { data: existing } = await supabase
    .from("products")
    .select("id, title, status, seller:seller_profiles(user_id)")
    .eq("id", listingId)
    .maybeSingle();

  if (!existing) {
    res.status(404).json({ error: "Listing not found." });
    return;
  }

  const { action, notes, is_featured, is_trending } = parsed.data;
  const newStatus = action === "UNPUBLISHED" ? "PAUSED" : action;
  const isActive = action !== "UNPUBLISHED" && action !== "REJECTED";
  const updateFields: Record<string, unknown> = {
    status: newStatus,
    is_active: isActive,
    admin_feedback: notes || null,
  };
  if (typeof is_featured === "boolean") updateFields.is_featured = is_featured;
  if (typeof is_trending === "boolean") updateFields.is_trending = is_trending;

  const { data: updated, error } = await supabase
    .from("products")
    .update(updateFields)
    .eq("id", listingId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  await supabase.from("listing_review_logs").insert({
    product_id: listingId,
    reviewer_id: req.auth!.userId,
    action,
    previous_status: existing.status,
    new_status: newStatus,
    notes: notes || null,
  });

  await supabase.from("audit_logs").insert({
    actor_id: req.auth!.userId,
    actor_role: "ADMIN",
    entity_type: "PRODUCT",
    entity_id: listingId,
    action,
    metadata: { notes: notes || null },
  });

  const sellerRel = existing.seller as unknown as { user_id?: string } | { user_id?: string }[] | null;
  const sellerUserId = Array.isArray(sellerRel) ? sellerRel[0]?.user_id : sellerRel?.user_id;
  if (sellerUserId) {
    await supabase.from("notifications").insert({
      user_id: sellerUserId,
      type: `LISTING_${action}`,
      title: `Listing ${action.replace(/_/g, " ")}`,
      body: `"${existing.title}" status is now ${newStatus}.${notes ? ` Note: ${notes}` : ""}`,
      link: "/seller",
    });
  }

  res.json({ product: updated });
});

adminRouter.post("/payments/:bookingId", async (req: AuthenticatedRequest, res) => {
  const parsed = adminPaymentDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid payment decision." });
    return;
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase.rpc("admin_verify_payment", {
    p_booking_id: String(req.params.bookingId),
    p_admin_id: req.auth!.userId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note ?? null,
  });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});

adminRouter.patch("/settings", async (req: AuthenticatedRequest, res) => {
  const parsed = adminSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid settings." });
    return;
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("admin_settings")
    .update({ ...parsed.data, updated_by: req.auth!.userId })
    .eq("id", 1)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ settings: data });
});

adminRouter.post("/categories", async (req, res) => {
  const schema = z.object({ name: z.string().trim().min(2).max(60) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid category name." });
    return;
  }
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: parsed.data.name, slug: slugify(parsed.data.name), is_active: true })
    .select()
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json({ category: data });
});

adminRouter.delete("/categories/:id", async (req, res) => {
  const supabase = getServiceSupabase();
  await supabase.from("categories").update({ is_active: false }).eq("id", String(req.params.id));
  res.json({ deactivated: true });
});

adminRouter.patch("/policies", async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    slug: z.string().min(2),
    title: z.string().min(2).max(120),
    content_markdown: z.string().min(10).max(20000),
    requires_legal_review: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid policy payload." });
    return;
  }
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("policies")
    .update({
      title: parsed.data.title,
      content_markdown: parsed.data.content_markdown,
      requires_legal_review: parsed.data.requires_legal_review,
      updated_by: req.auth!.userId,
    })
    .eq("slug", parsed.data.slug)
    .select()
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ policy: data });
});

adminRouter.patch("/users", async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    user_id: z.string().uuid(),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
    role: z.enum(["CUSTOMER", "SELLER", "ADMIN"]).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid user update." });
    return;
  }
  if (parsed.data.user_id === req.auth!.userId && parsed.data.status === "SUSPENDED") {
    res.status(400).json({ error: "You cannot suspend your own admin account." });
    return;
  }
  const updateFields: Record<string, string> = {};
  if (parsed.data.status) updateFields.status = parsed.data.status;
  if (parsed.data.role) updateFields.role = parsed.data.role;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("users")
    .update(updateFields)
    .eq("id", parsed.data.user_id)
    .select()
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ user: data });
});

adminRouter.patch("/sellers", async (req, res) => {
  const schema = z.object({
    seller_id: z.string().uuid(),
    verification_status: z.enum(["PENDING", "VERIFIED", "SUSPENDED"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid seller update." });
    return;
  }
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("seller_profiles")
    .update({ verification_status: parsed.data.verification_status })
    .eq("id", parsed.data.seller_id)
    .select()
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (data?.user_id) {
    if (parsed.data.verification_status === "VERIFIED") {
      await supabase.from("users").update({ role: "SELLER" }).eq("id", data.user_id);
      await supabase.from("notifications").insert({
        user_id: data.user_id,
        type: "SELLER_APPROVED",
        title: "Seller Account Approved!",
        body: "Badhai ho! Admin ne aapka Seller account approve kar diya hai. Ab aap apni listings daal sakte hain.",
        link: "/seller",
      });
    } else if (parsed.data.verification_status === "SUSPENDED") {
      await supabase.from("notifications").insert({
        user_id: data.user_id,
        type: "SELLER_SUSPENDED",
        title: "Seller Account Suspended",
        body: "Aapka Seller account admin ne suspend kar diya hai. Details ke liye support se sampark karein.",
        link: "/contact",
      });
    }
  }
  res.json({ seller: data });
});

adminRouter.post("/sellers", async (req, res) => {
  const schema = z.object({
    display_name: z.string().trim().min(2).max(120),
    email: z.string().email(),
    phone: z.string().trim().min(7).max(20),
    city: z.string().trim().min(2).max(80),
    locality: z.string().trim().max(80).optional().nullable(),
    pickup_address: z.string().trim().min(4).max(300),
    payout_upi_id: z.string().trim().min(3).max(100),
    payout_account_name: z.string().trim().min(2).max(120),
    bio: z.string().max(500).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid seller payload." });
    return;
  }

  const supabase = getServiceSupabase();
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.display_name, phone: parsed.data.phone },
  });

  if (authErr || !authData.user) {
    res.status(400).json({ error: authErr?.message || "Could not create seller auth user." });
    return;
  }

  const userId = authData.user.id;
  await supabase.from("users").upsert({
    id: userId,
    email: parsed.data.email,
    phone: parsed.data.phone,
    role: "SELLER",
    status: "ACTIVE",
  });

  const { data: seller, error: sellerErr } = await supabase
    .from("seller_profiles")
    .insert({
      user_id: userId,
      display_name: parsed.data.display_name,
      bio: parsed.data.bio || null,
      city: parsed.data.city,
      locality: parsed.data.locality || null,
      pickup_address: parsed.data.pickup_address,
      payout_upi_id: parsed.data.payout_upi_id,
      payout_account_name: parsed.data.payout_account_name,
      verification_status: "VERIFIED",
    })
    .select()
    .single();

  if (sellerErr) {
    res.status(500).json({ error: sellerErr.message });
    return;
  }

  res.status(201).json({ seller: { ...seller, email: parsed.data.email, phone: parsed.data.phone } });
});

adminRouter.patch("/bookings/:id/status", async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    status: z.enum([
      "AWAITING_PAYMENT",
      "PAYMENT_VERIFICATION_PENDING",
      "CONFIRMED",
      "READY_FOR_PICKUP",
      "DISPATCHED",
      "RENTAL_ACTIVE",
      "RETURN_DUE",
      "RETURN_INITIATED",
      "RETURNED",
      "INSPECTION_PENDING",
      "DEPOSIT_REFUND_PENDING",
      "COMPLETED",
      "CANCELLED",
      "DISPUTED",
    ]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid booking status." });
    return;
  }
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: parsed.data.status })
    .eq("id", String(req.params.id))
    .select()
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  await supabase.from("booking_status_logs").insert({
    booking_id: String(req.params.id),
    actor_id: req.auth!.userId,
    actor_role: "ADMIN",
    previous_status: "ADMIN_OVERRIDE",
    new_status: parsed.data.status,
    note: "Manual status override by Admin.",
  });
  res.json({ booking: data });
});

adminRouter.patch("/payouts", async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    payout_id: z.string().uuid(),
    status: z.enum(["PENDING", "APPROVED", "PROCESSING", "PAID", "FAILED"]),
    payout_reference: z.string().max(120).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payout update." });
    return;
  }
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("seller_payouts")
    .update({
      status: parsed.data.status,
      payout_reference: parsed.data.payout_reference || null,
      processed_by: req.auth!.userId,
      paid_at: parsed.data.status === "PAID" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.payout_id)
    .select()
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ payout: data });
});

adminRouter.post("/refunds", async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    booking_id: z.string().uuid(),
    deduction_amount: z.number().min(0).default(0),
    deduction_reason: z.string().max(500).optional().nullable(),
    refund_reference: z.string().min(3).max(120),
    notes: z.string().max(500).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid refund payload." });
    return;
  }
  const { booking_id, deduction_amount, deduction_reason, refund_reference, notes } = parsed.data;
  if (deduction_amount > 0 && !deduction_reason?.trim()) {
    res.status(400).json({ error: "A documented reason is required for deposit deductions." });
    return;
  }

  const supabase = getServiceSupabase();
  const { data: deposit } = await supabase
    .from("security_deposits")
    .select("*")
    .eq("booking_id", booking_id)
    .maybeSingle();

  if (!deposit) {
    res.status(404).json({ error: "Deposit record not found." });
    return;
  }

  const held = Number(deposit.amount_held || deposit.amount_expected);
  if (deduction_amount > held) {
    res.status(400).json({ error: "Deduction cannot exceed held security deposit." });
    return;
  }

  const refundAmount = Math.max(0, Math.round((held - deduction_amount) * 100) / 100);
  const depositStatus =
    refundAmount === 0 ? "FORFEITED" : deduction_amount > 0 ? "PARTIALLY_REFUNDED" : "REFUNDED";

  await supabase
    .from("security_deposits")
    .update({
      deduction_amount,
      deduction_reason: deduction_reason || null,
      refund_amount: refundAmount,
      status: depositStatus,
    })
    .eq("id", deposit.id);

  const { data: refund, error } = await supabase
    .from("refunds")
    .insert({
      security_deposit_id: deposit.id,
      booking_id,
      customer_id: deposit.customer_id,
      amount: refundAmount,
      refund_reference,
      method: "UPI",
      status: "PROCESSED",
      processed_by: req.auth!.userId,
      processed_at: new Date().toISOString(),
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  await supabase.from("bookings").update({ status: "COMPLETED" }).eq("id", booking_id);
  await supabase.from("booking_status_logs").insert({
    booking_id,
    actor_id: req.auth!.userId,
    actor_role: "ADMIN",
    previous_status: "DEPOSIT_REFUND_PENDING",
    new_status: "COMPLETED",
    note: `Deposit refund processed (₹${refundAmount}, Ref: ${refund_reference}).`,
  });

  res.status(201).json({ refund, depositStatus });
});

adminRouter.patch("/disputes", async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    dispute_id: z.string().uuid(),
    status: z.enum(["UNDER_REVIEW", "RESOLVED", "CLOSED"]),
    resolution_notes: z.string().min(3).max(1000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid dispute resolution." });
    return;
  }
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("disputes")
    .update({
      status: parsed.data.status,
      resolution_notes: parsed.data.resolution_notes,
      resolved_by: req.auth!.userId,
      resolved_at: parsed.data.status === "RESOLVED" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.dispute_id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ dispute: data });
});

adminRouter.get("/signed-proof", async (req, res) => {
  const bucket = String(req.query.bucket || "payment-proofs");
  const path = String(req.query.path || "");
  if (!path || !["payment-proofs", "return-evidence"].includes(bucket)) {
    res.status(400).json({ error: "Invalid bucket or path." });
    return;
  }
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 120);
  if (error || !data) {
    res.status(500).json({ error: error?.message || "Could not create signed URL." });
    return;
  }
  res.redirect(data.signedUrl);
});
