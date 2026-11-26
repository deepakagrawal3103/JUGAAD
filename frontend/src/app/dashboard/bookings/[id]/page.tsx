import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { formatISTDate, formatISTDateTime } from "@/lib/domain/dates";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/types/database";
import { BookingDetailActions } from "@/components/dashboards/BookingDetailActions";

export const dynamic = "force-dynamic";

export default async function CustomerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAuth();
  const { id } = await params;
  const supabase = await createServerSupabase();

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
          fulfillment_type, return_deadline
        ),
        security_deposit:security_deposits(status, amount_expected, amount_held, deduction_amount, deduction_reason, refund_amount)
      `)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("booking_status_logs")
      .select("id, previous_status, new_status, note, created_at")
      .eq("booking_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("payment_proofs")
      .select("id, utr_reference, paid_amount, review_status, review_note, created_at")
      .eq("booking_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!booking || (booking.customer_id !== ctx.userId && ctx.role !== "ADMIN")) {
    notFound();
  }

  const deposit = Array.isArray(booking.security_deposit) ? booking.security_deposit[0] : booking.security_deposit;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-[#E4DFD7] pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs uppercase tracking-widest text-[#8C857B] hover:text-[#161616]">
            ← Back to Dashboard
          </Link>
          <h1 className="font-editorial text-4xl font-semibold text-[#161616] mt-2">
            Booking {booking.booking_reference}
          </h1>
        </div>
        <div className="flex gap-2">
          <Badge variant="coral">{BOOKING_STATUS_LABELS[booking.status as BookingStatus] || booking.status}</Badge>
          <Badge variant={booking.payment_status === "VERIFIED" ? "success" : "warning"}>
            {booking.payment_status.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      {booking.status === "AWAITING_PAYMENT" && (
        <div className="rounded-2xl border border-[#E8D5B5] bg-[#FCF7EC] p-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[#9A6B1E]">Payment is required to confirm this reservation hold.</p>
          <Link href={`/checkout/${booking.id}`} className="rounded-xl bg-[#EB5E4C] text-white px-5 py-2.5 text-xs font-medium">
            Complete UPI Payment
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-4">
            <h2 className="font-editorial text-2xl font-semibold">Rented Items</h2>
            {booking.items.map((item) => (
              <div key={item.id} className="border-t border-[#E4DFD7] pt-4 flex gap-4">
                <div className="w-16 h-20 rounded-xl border border-[#E4DFD7] bg-[#F3EFEA] shrink-0 overflow-hidden">
                  {item.product_image_snapshot && (
                    <img src={item.product_image_snapshot} alt={item.product_title_snapshot} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="text-xs space-y-1">
                  <p className="text-sm font-semibold text-[#161616]">{item.product_title_snapshot}</p>
                  <p className="text-[#57534E]">{formatISTDate(item.start_date)} – {formatISTDate(item.end_date)} ({item.rental_days} days)</p>
                  <p className="text-[#57534E]">Return Deadline: <strong>{formatISTDateTime(item.return_deadline)}</strong></p>
                  <p className="tabular-nums">Rent {formatINR(item.rental_amount)} · Deposit {formatINR(item.security_deposit)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-4">
            <h2 className="font-editorial text-2xl font-semibold">Actions</h2>
            <BookingDetailActions bookingId={booking.id} status={booking.status} />
          </div>

          <div className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-4">
            <h2 className="font-editorial text-2xl font-semibold">Booking Timeline</h2>
            <div className="space-y-4">
              {(logs ?? []).map((log) => (
                <div key={log.id} className="border-l-2 border-[#EB5E4C] pl-4 space-y-0.5">
                  <p className="text-xs font-semibold text-[#161616]">{log.new_status.replace(/_/g, " ")}</p>
                  {log.note && <p className="text-xs text-[#57534E]">{log.note}</p>}
                  <p className="text-[11px] text-[#8C857B]">{formatISTDateTime(log.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-3 text-sm tabular-nums">
            <h2 className="font-editorial text-2xl font-semibold border-b border-[#E4DFD7] pb-3">Payment &amp; Deposit Summary</h2>
            <div className="flex justify-between text-[#57534E]"><span>Rental Total</span><span>{formatINR(booking.total_rental_amount)}</span></div>
            <div className="flex justify-between text-[#2F5D46]"><span>Refundable Security Deposit</span><span>{formatINR(booking.total_security_deposit)}</span></div>
            <div className="flex justify-between text-[#57534E]"><span>Delivery Fee</span><span>{formatINR(booking.total_delivery_fee)}</span></div>
            <div className="flex justify-between font-semibold border-t border-[#E4DFD7] pt-3"><span>Total Payable</span><span>{formatINR(booking.total_payable)}</span></div>

            {deposit && (
              <div className="border-t border-[#E4DFD7] pt-3 space-y-1 text-xs">
                <p>Deposit Status: <strong>{deposit.status.replace(/_/g, " ")}</strong></p>
                {Number(deposit.refund_amount) > 0 && <p className="text-[#2F5D46]">Refunded: {formatINR(deposit.refund_amount)}</p>}
                {Number(deposit.deduction_amount) > 0 && (
                  <p className="text-[#9E2A2B]">Deduction: {formatINR(deposit.deduction_amount)} ({deposit.deduction_reason})</p>
                )}
              </div>
            )}
          </div>

          {proofs && proofs.length > 0 && (
            <div className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-3">
              <h3 className="font-editorial text-xl font-semibold">Submitted Payment Proofs</h3>
              {proofs.map((p) => (
                <div key={p.id} className="border-t border-[#E4DFD7] pt-2 text-xs space-y-1">
                  <p className="font-mono-ref">UTR: {p.utr_reference} · {formatINR(p.paid_amount)}</p>
                  <p className="text-[#57534E]">Review: {p.review_status}</p>
                  {p.review_note && <p className="text-[#9A6B1E]">Note: {p.review_note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
