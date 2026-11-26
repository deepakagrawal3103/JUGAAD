import { Router } from "express";
import multer from "multer";
import { getServiceSupabase } from "../lib/supabase.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { paymentProofSchema } from "../validators/schemas.js";

export const paymentsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const ALLOWED_PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

paymentsRouter.post(
  "/upload-proof",
  requireAuth,
  rateLimit("proof-upload", 15, 60_000),
  upload.single("file"),
  async (req: AuthenticatedRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Screenshot file is required." });
      return;
    }
    if (!ALLOWED_PROOF_TYPES.includes(file.mimetype)) {
      res.status(400).json({ error: "Upload JPG, PNG, WebP, or PDF proof only." });
      return;
    }

    const ext = file.mimetype === "application/pdf" ? "pdf" : file.mimetype === "image/png" ? "png" : "jpg";
    const storagePath = `${req.auth!.userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const supabase = getServiceSupabase();
    const { error } = await supabase.storage
      .from("payment-proofs")
      .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ storage_path: storagePath });
  }
);

paymentsRouter.post(
  "/submit-proof",
  requireAuth,
  rateLimit("submit-proof", 10, 60_000),
  async (req: AuthenticatedRequest, res) => {
    const parsed = paymentProofSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid payment proof." });
      return;
    }

    const { booking_id, utr_reference, paid_amount, paid_at, screenshot_path, notes } = parsed.data;
    const supabase = getServiceSupabase();

    await supabase.rpc("release_expired_reservations");

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, booking_reference, customer_id, status")
      .eq("id", booking_id)
      .maybeSingle();

    if (!booking || booking.customer_id !== req.auth!.userId) {
      res.status(404).json({ error: "Booking not found." });
      return;
    }
    if (booking.status === "CANCELLED") {
      res.status(409).json({ error: "Reservation expired or cancelled." });
      return;
    }
    if (!["AWAITING_PAYMENT", "PAYMENT_VERIFICATION_PENDING"].includes(booking.status)) {
      res.status(400).json({ error: `Payment cannot be submitted in status ${booking.status}.` });
      return;
    }

    const { data: payment } = await supabase
      .from("payments")
      .select("id, status")
      .eq("booking_id", booking_id)
      .single();

    if (!payment || payment.status === "VERIFIED") {
      res.status(400).json({ error: "Payment is already verified." });
      return;
    }

    await supabase.from("payment_proofs").insert({
      payment_id: payment.id,
      booking_id,
      submitted_by: req.auth!.userId,
      utr_reference,
      paid_amount,
      paid_at: paid_at ? new Date(paid_at).toISOString() : new Date().toISOString(),
      screenshot_path: screenshot_path || null,
      notes: notes || null,
      review_status: "PENDING",
    });

    await supabase
      .from("payments")
      .update({ submitted_amount: paid_amount, status: "VERIFICATION_PENDING", rejection_reason: null })
      .eq("id", payment.id);

    await supabase
      .from("bookings")
      .update({ status: "PAYMENT_VERIFICATION_PENDING", payment_status: "PAYMENT_VERIFICATION_PENDING" })
      .eq("id", booking_id);

    await supabase.from("booking_status_logs").insert({
      booking_id,
      actor_id: req.auth!.userId,
      actor_role: req.auth!.role,
      previous_status: booking.status,
      new_status: "PAYMENT_VERIFICATION_PENDING",
      note: `Customer submitted UPI UTR ${utr_reference}. Awaiting admin verification.`,
    });

    await supabase.from("notifications").insert({
      user_id: req.auth!.userId,
      type: "PAYMENT_PROOF_SUBMITTED",
      title: "Payment Proof Received",
      body: `UTR ${utr_reference} submitted for ${booking.booking_reference}. Verification is pending admin review.`,
      link: `/dashboard/bookings/${booking_id}`,
    });

    res.json({ success: true, status: "PAYMENT_VERIFICATION_PENDING" });
  }
);
