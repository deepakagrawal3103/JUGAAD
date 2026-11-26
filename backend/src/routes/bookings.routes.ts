import { Router } from "express";
import { z } from "zod";
import { isValidBookingTransition } from "../domain/state-machine.js";
import { getServiceSupabase } from "../lib/supabase.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import type { BookingStatus } from "../types/domain.js";
import { checkoutSchema, returnInspectionSchema } from "../validators/schemas.js";

export const bookingsRouter = Router();

bookingsRouter.post(
  "/checkout",
  requireAuth,
  rateLimit("checkout", 10, 60_000),
  async (req: AuthenticatedRequest, res) => {
    const parsed = checkoutSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid checkout payload." });
      return;
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase.rpc("create_booking_from_cart", {
      p_customer_id: req.auth!.userId,
      p_delivery_address: parsed.data.delivery_address ?? null,
      p_customer_notes: parsed.data.customer_notes ?? null,
    });

    if (error) {
      const status = error.message.toLowerCase().includes("unavailable") ? 409 : 400;
      res.status(status).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  }
);

bookingsRouter.get("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const supabase = getServiceSupabase();
  const bookingId = String(req.params.id);
  const [{ data: booking }, { data: logs }, { data: proofs }] = await Promise.all([
    supabase
      .from("bookings")
      .select(`
        id, booking_reference, customer_id, status, payment_status,
        total_rental_amount, total_security_deposit, total_delivery_fee, total_payable,
        payment_expires_at, confirmed_at, cancelled_at, cancellation_reason, created_at,
        items:booking_items(
          id, product_title_snapshot, product_image_snapshot, start_date, end_date,
          rental_days, daily_rate_snapshot, rental_amount, security_deposit, delivery_fee,
          fulfillment_type, return_deadline, seller_id
        ),
        security_deposit:security_deposits(status, amount_expected, amount_held, deduction_amount, deduction_reason, refund_amount),
        payment:payments(rejection_reason, status)
      `)
      .eq("id", bookingId)
      .maybeSingle(),
    supabase
      .from("booking_status_logs")
      .select("id, previous_status, new_status, note, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true }),
    supabase
      .from("payment_proofs")
      .select("id, utr_reference, paid_amount, review_status, review_note, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false }),
  ]);

  if (!booking) {
    res.status(404).json({ error: "Booking not found." });
    return;
  }

  const isCustomer = booking.customer_id === req.auth!.userId;
  const isAdmin = req.auth!.role === "ADMIN";
  const isSeller = Boolean(
    req.auth!.sellerProfileId &&
      (booking.items ?? []).some((i: { seller_id: string }) => i.seller_id === req.auth!.sellerProfileId)
  );

  if (!isCustomer && !isAdmin && !isSeller) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json({
    booking: {
      ...booking,
      security_deposit: Array.isArray(booking.security_deposit)
        ? booking.security_deposit[0] ?? null
        : booking.security_deposit,
      payment: Array.isArray(booking.payment) ? booking.payment[0] ?? null : booking.payment,
    },
    logs: logs ?? [],
    proofs: proofs ?? [],
  });
});

const transitionSchema = z.object({
  next_status: z.enum([
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
  note: z.string().max(500).optional(),
});

bookingsRouter.post("/:id/transition", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = transitionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid booking status transition." });
    return;
  }

  const bookingId = String(req.params.id);
  const supabase = getServiceSupabase();
  const [{ data: booking }, { data: settings }, { data: items }] = await Promise.all([
    supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle(),
    supabase.from("admin_settings").select("allowed_booking_transitions").eq("id", 1).maybeSingle(),
    supabase.from("booking_items").select("seller_id").eq("booking_id", bookingId),
  ]);

  if (!booking) {
    res.status(404).json({ error: "Booking not found." });
    return;
  }

  const isCustomer = booking.customer_id === req.auth!.userId;
  const isSeller = Boolean(
    req.auth!.sellerProfileId &&
      (items ?? []).some((i: { seller_id: string }) => i.seller_id === req.auth!.sellerProfileId)
  );
  const isAdmin = req.auth!.role === "ADMIN";

  if (!isCustomer && !isSeller && !isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const nextStatus = parsed.data.next_status as BookingStatus;
  const currentStatus = booking.status as BookingStatus;

  if (!isAdmin) {
    if (isCustomer && !["RETURN_INITIATED", "CANCELLED"].includes(nextStatus)) {
      res.status(403).json({ error: "Customers can only initiate returns or cancel eligible bookings." });
      return;
    }
    if (
      isCustomer &&
      nextStatus === "CANCELLED" &&
      !["AWAITING_PAYMENT", "PAYMENT_VERIFICATION_PENDING", "CONFIRMED"].includes(currentStatus)
    ) {
      res.status(400).json({ error: "Booking can no longer be self-cancelled." });
      return;
    }
    if (
      isSeller &&
      !["READY_FOR_PICKUP", "DISPATCHED", "RENTAL_ACTIVE", "RETURNED", "INSPECTION_PENDING"].includes(nextStatus)
    ) {
      res.status(403).json({ error: "Action restricted to administrators." });
      return;
    }
  }

  if (
    !isValidBookingTransition(
      currentStatus,
      nextStatus,
      settings?.allowed_booking_transitions as Record<string, string[]> | null
    )
  ) {
    res.status(400).json({ error: `Transition from ${currentStatus} to ${nextStatus} is not permitted.` });
    return;
  }

  const updateData: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "CANCELLED") {
    updateData.cancelled_at = new Date().toISOString();
    updateData.cancellation_reason = parsed.data.note || "Cancelled by user";
    await supabase.from("inventory_reservations").update({ status: "RELEASED" }).eq("booking_id", bookingId);
  }

  const { error } = await supabase.from("bookings").update(updateData).eq("id", bookingId);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  await supabase.from("booking_status_logs").insert({
    booking_id: bookingId,
    actor_id: req.auth!.userId,
    actor_role: req.auth!.role,
    previous_status: currentStatus,
    new_status: nextStatus,
    note: parsed.data.note || null,
  });

  await supabase.from("notifications").insert({
    user_id: booking.customer_id,
    type: `BOOKING_${nextStatus}`,
    title: `Booking ${booking.booking_reference} Updated`,
    body: `Status updated to ${nextStatus.replace(/_/g, " ")}.`,
    link: `/dashboard/bookings/${bookingId}`,
  });

  res.json({ success: true, status: nextStatus });
});

bookingsRouter.post("/:id/inspect", requireAuth, async (req: AuthenticatedRequest, res) => {
  const bookingId = String(req.params.id);
  const parsed = returnInspectionSchema.safeParse({ ...req.body, booking_id: bookingId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid inspection payload." });
    return;
  }

  const supabase = getServiceSupabase();
  const [{ data: booking }, { data: items }] = await Promise.all([
    supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle(),
    supabase.from("booking_items").select("id, seller_id").eq("booking_id", bookingId),
  ]);

  if (!booking) {
    res.status(404).json({ error: "Booking not found." });
    return;
  }

  const isSeller = Boolean(
    req.auth!.sellerProfileId &&
      (items ?? []).some((i: { seller_id: string }) => i.seller_id === req.auth!.sellerProfileId)
  );
  const isAdmin = req.auth!.role === "ADMIN";
  if (!isSeller && !isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { data: inspection, error } = await supabase
    .from("return_inspections")
    .insert({
      booking_id: bookingId,
      booking_item_id: parsed.data.booking_item_id || items?.[0]?.id || null,
      inspector_id: req.auth!.userId,
      inspector_role: isAdmin ? "ADMIN" : "SELLER",
      condition_status: parsed.data.condition_status,
      damage_found: parsed.data.damage_found,
      deduction_recommended: parsed.data.deduction_recommended,
      evidence_paths: parsed.data.evidence_paths,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const nextStatus = parsed.data.damage_found ? "DISPUTED" : "DEPOSIT_REFUND_PENDING";
  await supabase.from("bookings").update({ status: nextStatus }).eq("id", bookingId);
  if (!parsed.data.damage_found) {
    await supabase.from("security_deposits").update({ status: "REFUND_PENDING" }).eq("booking_id", bookingId);
  }

  await supabase.from("booking_status_logs").insert({
    booking_id: bookingId,
    actor_id: req.auth!.userId,
    actor_role: req.auth!.role,
    previous_status: booking.status,
    new_status: nextStatus,
    note: `Return inspection (${parsed.data.condition_status}). ${parsed.data.notes || ""}`,
  });

  res.status(201).json({ inspection, status: nextStatus });
});
