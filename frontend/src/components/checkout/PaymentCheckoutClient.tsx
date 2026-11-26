"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, MessageCircle, Upload, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api/client";
import { formatINR } from "@/lib/utils";
import { formatISTDate, getCountdownParts } from "@/lib/domain/dates";
import { buildWhatsAppPaymentUrl } from "@/lib/domain/whatsapp";

interface CheckoutBookingProps {
  booking: {
    id: string;
    booking_reference: string;
    status: string;
    payment_status: string;
    total_rental_amount: number;
    total_security_deposit: number;
    total_delivery_fee: number;
    total_payable: number;
    payment_expires_at: string | null;
    items: {
      id: string;
      product_title_snapshot: string;
      product_image_snapshot?: string | null;
      start_date: string;
      end_date: string;
      rental_days: number;
      rental_amount: number;
      security_deposit: number;
      delivery_fee: number;
    }[];
    payment?: { rejection_reason?: string | null } | null;
  };
  customerName: string;
  upiSettings: {
    upi_id: string;
    upi_display_name: string;
    upi_qr_url: string;
    whatsapp_number: string;
    payment_instructions: string;
  };
}

export function PaymentCheckoutClient({
  booking,
  customerName,
  upiSettings,
}: CheckoutBookingProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(() =>
    booking.payment_expires_at
      ? getCountdownParts(booking.payment_expires_at)
      : { expired: false, totalSeconds: 0, label: "" }
  );

  const [utr, setUtr] = useState("");
  const [paidAmount, setPaidAmount] = useState(String(booking.total_payable));
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!booking.payment_expires_at || booking.status !== "AWAITING_PAYMENT") return;
    const timer = setInterval(() => {
      setCountdown(getCountdownParts(booking.payment_expires_at!));
    }, 1000);
    return () => clearInterval(timer);
  }, [booking.payment_expires_at, booking.status]);

  const handleCopyUpi = async () => {
    if (!upiSettings.upi_id) return;
    await navigator.clipboard.writeText(upiSettings.upi_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/payments/upload-proof", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Screenshot upload failed.");
        return;
      }
      setScreenshotPath(data.storage_path);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/payments/submit-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          utr_reference: utr,
          paid_amount: Number(paidAmount),
          paid_at: paidAt || undefined,
          screenshot_path: screenshotPath,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit payment proof.");
        return;
      }
      router.push(`/dashboard/bookings/${booking.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappUrl = buildWhatsAppPaymentUrl({
    whatsappNumber: upiSettings.whatsapp_number,
    bookingReference: booking.booking_reference,
    customerName,
    amountPaid: Number(paidAmount || booking.total_payable),
    utrReference: utr.trim(),
  });

  const isVerifying = booking.status === "PAYMENT_VERIFICATION_PENDING";
  const isConfirmed = booking.payment_status === "VERIFIED";
  const isCancelled = booking.status === "CANCELLED";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-7 space-y-6">
        {booking.status === "AWAITING_PAYMENT" && booking.payment_expires_at && (
          <div className="rounded-2xl border border-[#E8D5B5] bg-[#FCF7EC] p-4 flex items-center justify-between text-xs text-[#9A6B1E]">
            <div className="flex items-center gap-2 font-medium">
              <Clock className="h-4 w-4" />
              <span>Reservation Hold Active — Complete UPI payment before expiry</span>
            </div>
            <span className="font-mono-ref font-semibold text-sm">{countdown.label}</span>
          </div>
        )}

        {booking.payment?.rejection_reason && booking.status === "AWAITING_PAYMENT" && (
          <div className="rounded-2xl border border-[#E6C5C5] bg-[#FDF1F1] p-4 text-xs text-[#9E2A2B] flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div><strong>Previous proof needs attention:</strong> {booking.payment.rejection_reason}</div>
          </div>
        )}

        {isVerifying && (
          <div className="rounded-2xl border border-[#E8D5B5] bg-[#FCF7EC] p-5 space-y-1 text-sm text-[#9A6B1E]">
            <p className="font-semibold">Payment Verification Pending</p>
            <p className="text-xs">Our team is verifying your UPI transaction. Booking confirms upon verification.</p>
          </div>
        )}

        {isConfirmed && (
          <div className="rounded-2xl border border-[#C4DACB] bg-[#EDF5F0] p-5 text-sm text-[#2F5D46] font-medium">
            Payment Verified! Your rental booking is confirmed.
          </div>
        )}

        {isCancelled && (
          <div className="rounded-2xl border border-[#E6C5C5] bg-[#FDF1F1] p-5 text-sm text-[#9E2A2B]">
            This reservation expired or was cancelled. Inventory dates have been released.
          </div>
        )}

        {/* UPI Scan & Pay Card */}
        <div className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#E4DFD7] pb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#8C857B]">Manual UPI Verification</p>
              <h2 className="font-editorial text-2xl font-semibold text-[#161616]">
                Pay {formatINR(booking.total_payable)} via UPI
              </h2>
            </div>
            <Badge variant="coral">{booking.status.replace(/_/g, " ")}</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div className="rounded-2xl border border-[#E4DFD7] bg-[#FAF8F5] p-4 flex items-center justify-center min-h-[210px]">
              {upiSettings.upi_qr_url ? (
                <img src={upiSettings.upi_qr_url} alt="UPI QR Code" className="max-h-48 w-auto object-contain" />
              ) : (
                <p className="text-xs text-center text-[#8C857B] px-4">
                  UPI QR code can be uploaded in Admin Settings. Copy the UPI ID on the right.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#8C857B]">Account Display Name</p>
                <p className="text-sm font-semibold text-[#161616]">{upiSettings.upi_display_name}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#8C857B]">UPI ID</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 rounded-xl border border-[#E4DFD7] bg-[#FAF8F5] px-3 py-2 text-xs font-mono-ref">
                    {upiSettings.upi_id || "Configure in Admin Settings"}
                  </code>
                  <Button type="button" variant="subtle" size="sm" onClick={handleCopyUpi} disabled={!upiSettings.upi_id}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">{upiSettings.payment_instructions}</p>
            </div>
          </div>
        </div>

        {!isConfirmed && !isCancelled && (
          <form onSubmit={handleSubmitProof} className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-4">
            <h3 className="font-editorial text-2xl font-semibold">Submit Payment Proof</h3>
            {error && <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] p-3 text-xs text-[#9E2A2B]">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#57534E]">UTR / Transaction Reference *</label>
                <Input required value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 432910847291" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#57534E]">Amount Paid (₹) *</label>
                <Input type="number" step="0.01" required value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#57534E]">Payment Date &amp; Time</label>
                <Input type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#57534E]">Payment Screenshot</label>
                <label className="flex h-11 rounded-xl items-center gap-2 border border-[#E4DFD7] bg-[#FAF8F5] px-3 text-xs cursor-pointer hover:border-[#161616]">
                  <Upload className="h-4 w-4" />
                  <span className="truncate">
                    {uploading ? "Uploading..." : screenshotPath ? "Screenshot Uploaded" : "Upload Screenshot"}
                  </span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleScreenshotUpload} className="hidden" />
                </label>
              </div>
            </div>

            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Remarks (optional)..." />

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button type="submit" variant="accent" size="lg" disabled={submitting || countdown.expired} className="flex-1">
                {submitting ? "Submitting..." : "I have completed payment"}
              </Button>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2F5D46] bg-[#EDF5F0] text-[#2F5D46] px-5 py-3 text-xs font-semibold hover:bg-[#2F5D46] hover:text-white transition-colors"
                >
                  <MessageCircle className="h-4 w-4" /> Send Payment Confirmation on WhatsApp
                </a>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Right: Stitch Price Breakdown Card */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-2xl border border-[#E4DFD7] bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E4DFD7] pb-3">
            <span className="text-xs uppercase tracking-wider text-[#8C857B]">Booking Reference</span>
            <span className="font-mono-ref text-sm font-semibold">{booking.booking_reference}</span>
          </div>

          {booking.items.map((item) => (
            <div key={item.id} className="flex gap-3 border-b border-[#E4DFD7] pb-3 text-xs">
              <div className="w-12 h-16 rounded-lg bg-[#F3EFEA] border border-[#E4DFD7] overflow-hidden shrink-0">
                {item.product_image_snapshot && (
                  <img src={item.product_image_snapshot} alt={item.product_title_snapshot} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="font-semibold text-sm text-[#161616]">{item.product_title_snapshot}</p>
                <p className="text-[#57534E]">
                  {formatISTDate(item.start_date)} – {formatISTDate(item.end_date)} ({item.rental_days} Days)
                </p>
              </div>
            </div>
          ))}

          <div className="rounded-xl bg-[#F3EFEA]/80 p-4 space-y-2.5 text-sm tabular-nums">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Price Breakdown</span>
              <span className="text-[10px] uppercase tracking-widest text-[#57534E]">100% Transparent</span>
            </div>
            <div className="flex justify-between text-[#57534E]">
              <span>Rental Charges</span>
              <span>{formatINR(booking.total_rental_amount)}</span>
            </div>
            <div className="flex justify-between text-[#57534E]">
              <span>Delivery Fee</span>
              <span>{formatINR(booking.total_delivery_fee)}</span>
            </div>
            <div className="flex justify-between text-[#2F5D46]">
              <div>
                <span>Refundable Security Deposit</span>
                <span className="block text-[10px] text-[#8C857B]">Credited back via UPI after return inspection</span>
              </div>
              <span>{formatINR(booking.total_security_deposit)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-[#E4DFD7] pt-2.5">
              <span>Total Payable Now</span>
              <span>{formatINR(booking.total_payable)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#C4DACB] bg-[#EDF5F0] p-3 text-xs text-[#2F5D46] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Commission applies only to rental charges. Deposit is 100% protected.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
