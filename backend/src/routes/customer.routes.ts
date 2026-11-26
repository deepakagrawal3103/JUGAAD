import { Router } from "express";
import { getServiceSupabase } from "../lib/supabase.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { disputeCreateSchema, profileUpdateSchema } from "../validators/schemas.js";

export const customerRouter = Router();

customerRouter.get("/dashboard", requireAuth, async (req: AuthenticatedRequest, res) => {
  const supabase = getServiceSupabase();
  // Explicitly omit admin_internal_notes for customer view
  const [{ data: bookings }, { data: profile }] = await Promise.all([
    supabase
      .from("bookings")
      .select(`
        id, booking_reference, status, payment_status,
        total_rental_amount, total_security_deposit, total_payable, created_at,
        items:booking_items(id, product_title_snapshot, product_image_snapshot, start_date, end_date, return_deadline),
        security_deposit:security_deposits(status, amount_held, refund_amount, deduction_amount)
      `)
      .eq("customer_id", req.auth!.userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_profiles")
      .select("full_name, phone, city, state, address_line, pincode, preferred_size")
      .eq("user_id", req.auth!.userId)
      .maybeSingle(),
  ]);

  const normalized = (bookings ?? []).map((b) => ({
    ...b,
    security_deposit: Array.isArray(b.security_deposit)
      ? b.security_deposit[0] ?? null
      : b.security_deposit,
  }));

  res.json({ bookings: normalized, profile, user: req.auth });
});

customerRouter.patch("/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid profile details." });
    return;
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({ user_id: req.auth!.userId, ...parsed.data }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Request could not be completed." });
    return;
  }
  res.json({ profile: data });
});

customerRouter.get("/notifications", requireAuth, async (req: AuthenticatedRequest, res) => {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", req.auth!.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    res.status(500).json({ error: "Request could not be completed." });
    return;
  }
  res.json({ notifications: data ?? [] });
});

customerRouter.patch("/notifications", requireAuth, async (req: AuthenticatedRequest, res) => {
  const supabase = getServiceSupabase();
  if (req.body?.id) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", req.body.id)
      .eq("user_id", req.auth!.userId);
  } else {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", req.auth!.userId)
      .eq("is_read", false);
  }
  res.json({ success: true });
});

customerRouter.post("/disputes", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = disputeCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid dispute payload." });
    return;
  }

  const supabase = getServiceSupabase();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, status")
    .eq("id", parsed.data.booking_id)
    .maybeSingle();

  if (!booking || (booking.customer_id !== req.auth!.userId && req.auth!.role !== "ADMIN")) {
    res.status(404).json({ error: "Booking not found." });
    return;
  }

  const { data: dispute, error } = await supabase
    .from("disputes")
    .insert({
      booking_id: parsed.data.booking_id,
      opened_by: req.auth!.userId,
      dispute_type: parsed.data.dispute_type,
      description: parsed.data.description,
      evidence_paths: parsed.data.evidence_paths,
      status: "OPEN",
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Request could not be completed." });
    return;
  }

  await supabase.from("bookings").update({ status: "DISPUTED" }).eq("id", parsed.data.booking_id);
  await supabase.from("booking_status_logs").insert({
    booking_id: parsed.data.booking_id,
    actor_id: req.auth!.userId,
    actor_role: req.auth!.role,
    previous_status: booking.status,
    new_status: "DISPUTED",
    note: `Dispute opened: ${parsed.data.dispute_type}`,
  });

  res.status(201).json({ dispute });
});
