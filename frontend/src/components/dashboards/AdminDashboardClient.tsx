"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ExternalLink, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiFetch, getApiUrl } from "@/lib/api/client";
import { formatINR } from "@/lib/utils";
import { formatISTDate, formatISTDateTime } from "@/lib/domain/dates";
import type { AdminSettingsRecord, CategoryRecord } from "@/types/database";

type AdminTab =
  | "overview"
  | "listings"
  | "payments"
  | "bookings"
  | "deposits"
  | "payouts"
  | "disputes"
  | "users"
  | "cms";

interface AdminProps {
  metrics: {
    totalUsers: number;
    totalSellers: number;
    activeListings: number;
    pendingListings: number;
    totalBookings: number;
    confirmedBookings: number;
    activeRentals: number;
    paymentPendingCount: number;
    rentalVolume: number;
    platformCommission: number;
    sellerEarnings: number;
    refundsPending: number;
    depositsHeld: number;
    returnsPending: number;
    openDisputes: number;
  };
  listings: Array<{
    id: string;
    title: string;
    brand: string;
    daily_price: number;
    security_deposit: number;
    condition: string;
    status: string;
    is_featured: boolean;
    is_trending: boolean;
    created_at: string;
    category?: { name: string } | null;
    seller?: { display_name: string; city: string } | null;
    images?: { public_url: string; is_primary: boolean }[];
  }>;
  paymentQueue: Array<{
    id: string;
    booking_id: string;
    utr_reference: string;
    paid_amount: number;
    screenshot_path: string | null;
    review_status: string;
    created_at: string;
    booking?: { id: string; booking_reference: string; total_payable: number; status: string; customer?: { email: string } | null } | null;
  }>;
  bookings: Array<{
    id: string;
    booking_reference: string;
    status: string;
    payment_status: string;
    total_payable: number;
    created_at: string;
    customer?: { email: string } | null;
    items: { product_title_snapshot: string; start_date: string; end_date: string }[];
  }>;
  deposits: Array<{
    id: string;
    booking_id: string;
    amount_held: number;
    deduction_amount: number;
    refund_amount: number;
    status: string;
    booking?: { booking_reference: string; status: string } | null;
  }>;
  payouts: Array<{
    id: string;
    amount: number;
    status: string;
    payout_reference: string | null;
    seller?: { display_name: string; payout_upi_id: string | null } | null;
    booking?: { booking_reference: string } | null;
  }>;
  disputes: Array<{
    id: string;
    dispute_type: string;
    status: string;
    description: string;
    booking?: { booking_reference: string } | null;
  }>;
  users: Array<{ id: string; email: string; role: string; status: string }>;
  categories: CategoryRecord[];
  policies: Array<{ id: string; slug: string; title: string; content_markdown: string; requires_legal_review: boolean }>;
  settings: AdminSettingsRecord;
}

export function AdminDashboardClient({
  metrics,
  listings,
  paymentQueue,
  bookings,
  deposits,
  payouts,
  disputes,
  users,
  categories,
  policies,
  settings,
}: AdminProps) {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});
  const [bookingQuery, setBookingQuery] = useState("");
  const [refundBookingId, setRefundBookingId] = useState<string | null>(null);
  const [refundRef, setRefundRef] = useState("");
  const [deductionAmt, setDeductionAmt] = useState("0");
  const [deductionReason, setDeductionReason] = useState("");
  const [payoutRefs, setPayoutRefs] = useState<Record<string, string>>({});

  const [settingsForm, setSettingsForm] = useState({
    brand_name: settings.brand_name,
    brand_tagline: settings.brand_tagline,
    commission_percent: String(settings.commission_percent),
    reservation_hold_minutes: String(settings.reservation_hold_minutes),
    cleaning_buffer_days: String(settings.cleaning_buffer_days),
    late_fee_grace_hours: String(settings.late_fee_grace_hours),
    late_fee_policy_summary: settings.late_fee_policy_summary,
    upi_id: settings.upi_id,
    upi_display_name: settings.upi_display_name,
    upi_qr_url: settings.upi_qr_url,
    whatsapp_number: settings.whatsapp_number,
    payment_instructions: settings.payment_instructions,
  });

  const [newCatName, setNewCatName] = useState("");
  const [selectedPolicySlug, setSelectedPolicySlug] = useState(policies[0]?.slug || "");
  const selectedPolicy = policies.find((p) => p.slug === selectedPolicySlug);
  const [policyContent, setPolicyContent] = useState(selectedPolicy?.content_markdown || "");

  const handleListingAction = async (
    id: string,
    action: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "PAUSED" | "UNPUBLISHED",
    extra?: { is_featured?: boolean; is_trending?: boolean }
  ) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await apiFetch(`/api/admin/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: reviewNotes[id] || null, ...extra }),
      });
      const data = await res.json();
      setStatusMsg(res.ok ? `Listing updated (${action}).` : data.error || "Failed.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handlePaymentDecision = async (
    bookingId: string,
    decision: "VERIFIED" | "REJECTED" | "MORE_PROOF_REQUESTED"
  ) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await apiFetch(`/api/admin/payments/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: paymentNotes[bookingId] || null }),
      });
      const data = await res.json();
      setStatusMsg(res.ok ? `Payment marked ${decision}.` : data.error || "Failed.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundBookingId) return;
    setBusy(true);
    try {
      const res = await apiFetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: refundBookingId,
          deduction_amount: Number(deductionAmt || 0),
          deduction_reason: deductionReason || null,
          refund_reference: refundRef,
        }),
      });
      const data = await res.json();
      setStatusMsg(res.ok ? "Deposit refund processed." : data.error || "Refund failed.");
      if (res.ok) setRefundBookingId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handlePayoutUpdate = async (payoutId: string, status: string) => {
    setBusy(true);
    try {
      const res = await apiFetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout_id: payoutId, status, payout_reference: payoutRefs[payoutId] || null }),
      });
      setStatusMsg(res.ok ? `Payout updated to ${status}.` : "Failed.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleUser = async (userId: string, nextStatus: "ACTIVE" | "SUSPENDED") => {
    setBusy(true);
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, status: nextStatus }),
      });
      setStatusMsg(res.ok ? `User status set to ${nextStatus}.` : "Failed.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settingsForm,
          commission_percent: Number(settingsForm.commission_percent),
          reservation_hold_minutes: Number(settingsForm.reservation_hold_minutes),
          cleaning_buffer_days: Number(settingsForm.cleaning_buffer_days),
          late_fee_grace_hours: Number(settingsForm.late_fee_grace_hours),
        }),
      });
      const data = await res.json();
      setStatusMsg(res.ok ? "Platform settings saved." : data.error || "Failed.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (!bookingQuery.trim()) return true;
    const q = bookingQuery.toLowerCase();
    return (
      b.booking_reference.toLowerCase().includes(q) ||
      (b.customer?.email || "").toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q)
    );
  });

  const TABS: { key: AdminTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "listings", label: `Listings (${metrics.pendingListings})` },
    { key: "payments", label: `Payments (${metrics.paymentPendingCount})` },
    { key: "bookings", label: "Bookings" },
    { key: "deposits", label: "Deposits & Refunds" },
    { key: "payouts", label: "Seller Payouts" },
    { key: "disputes", label: `Disputes (${metrics.openDisputes})` },
    { key: "users", label: "Users" },
    { key: "cms", label: "Categories, Policies & Settings" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 border-b border-[#E4DFD7] pb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium border ${
              tab === t.key ? "border-[#EB5E4C] bg-[#FDECE9] text-[#D94E3D]" : "border-[#E4DFD7] bg-white text-[#57534E]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-[#E4DFD7] bg-[#F3EFEA] px-4 py-3 text-xs font-medium">{statusMsg}</div>
      )}

      {tab === "overview" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Users", val: metrics.totalUsers },
            { label: "Total Sellers", val: metrics.totalSellers },
            { label: "Active Listings", val: metrics.activeListings },
            { label: "Pending Listings", val: metrics.pendingListings },
            { label: "Total Bookings", val: metrics.totalBookings },
            { label: "Confirmed Bookings", val: metrics.confirmedBookings },
            { label: "Active Rentals", val: metrics.activeRentals },
            { label: "Payment Queue", val: metrics.paymentPendingCount },
            { label: "Rental Volume", val: formatINR(metrics.rentalVolume) },
            { label: "Platform Commission", val: formatINR(metrics.platformCommission) },
            { label: "Seller Earnings", val: formatINR(metrics.sellerEarnings) },
            { label: "Deposits Held", val: formatINR(metrics.depositsHeld) },
            { label: "Refunds Pending", val: metrics.refundsPending },
            { label: "Returns Pending", val: metrics.returnsPending },
            { label: "Open Disputes", val: metrics.openDisputes },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-[#E4DFD7] bg-white p-5">
              <p className="text-[11px] uppercase tracking-wider text-[#8C857B]">{m.label}</p>
              <p className="font-editorial text-2xl font-semibold mt-1 tabular-nums">{m.val}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "listings" && (
        <div className="space-y-4">
          {listings.map((item) => {
            const img = item.images?.find((i) => i.is_primary)?.public_url || item.images?.[0]?.public_url;
            return (
              <div key={item.id} className="rounded-2xl border border-[#E4DFD7] bg-white p-5 space-y-4">
                <div className="flex gap-4">
                  <div className="w-16 h-20 rounded-xl border border-[#E4DFD7] bg-[#F3EFEA] shrink-0 overflow-hidden">
                    {img && <img src={img} alt={item.title} className="h-full w-full object-cover" />}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.status === "APPROVED" ? "success" : item.status === "REJECTED" ? "danger" : "warning"}>
                        {item.status}
                      </Badge>
                      <span className="text-[#8C857B]">{item.category?.name} · {item.condition}</span>
                    </div>
                    <p className="text-sm font-semibold text-[#161616]">{item.title} ({item.brand})</p>
                    <p className="text-[#57534E]">Seller: {item.seller?.display_name} ({item.seller?.city})</p>
                    <p className="tabular-nums">Rent: <strong>{formatINR(item.daily_price)}/day</strong> · Deposit: <strong>{formatINR(item.security_deposit)}</strong></p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <Input
                    value={reviewNotes[item.id] || ""}
                    onChange={(e) => setReviewNotes({ ...reviewNotes, [item.id]: e.target.value })}
                    placeholder="Admin review note..."
                    className="flex-1"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="accent" disabled={busy} onClick={() => handleListingAction(item.id, "APPROVED")}>
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="subtle" disabled={busy} onClick={() => handleListingAction(item.id, "CHANGES_REQUESTED")}>
                      <MessageSquare className="h-3.5 w-3.5" /> Changes
                    </Button>
                    <Button size="sm" variant="destructive" disabled={busy} onClick={() => handleListingAction(item.id, "REJECTED")}>
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button size="sm" variant="subtle" disabled={busy} onClick={() => handleListingAction(item.id, "UNPUBLISHED")}>
                      Unpublish
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "payments" && (
        <div className="space-y-4">
          {paymentQueue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D6CFC5] bg-white p-12 text-center text-sm text-[#8C857B]">
              No payment proofs submitted yet.
            </div>
          ) : (
            paymentQueue.map((proof) => (
              <div key={proof.id} className="rounded-2xl border border-[#E4DFD7] bg-white p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-ref text-sm font-semibold">{proof.booking?.booking_reference}</span>
                      <Badge variant={proof.review_status === "VERIFIED" ? "success" : proof.review_status === "REJECTED" ? "danger" : "warning"}>
                        {proof.review_status}
                      </Badge>
                    </div>
                    <p className="text-[#57534E]">Customer: {proof.booking?.customer?.email} · {formatISTDateTime(proof.created_at)}</p>
                    <p className="tabular-nums">
                      Expected: <strong>{formatINR(proof.booking?.total_payable)}</strong> · Submitted: <strong>{formatINR(proof.paid_amount)}</strong> · UTR:{" "}
                      <span className="font-mono-ref font-semibold">{proof.utr_reference}</span>
                    </p>
                  </div>
                  {proof.screenshot_path && (
                    <a
                      href={getApiUrl(`/api/admin/signed-proof?bucket=payment-proofs&path=${encodeURIComponent(proof.screenshot_path)}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4DFD7] px-3 py-2 text-xs"
                    >
                      View Screenshot <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                {proof.review_status === "PENDING" && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      value={paymentNotes[proof.booking_id] || ""}
                      onChange={(e) => setPaymentNotes({ ...paymentNotes, [proof.booking_id]: e.target.value })}
                      placeholder="Verification note / rejection reason..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="accent" disabled={busy} onClick={() => handlePaymentDecision(proof.booking_id, "VERIFIED")}>
                        Verify Payment
                      </Button>
                      <Button size="sm" variant="subtle" disabled={busy} onClick={() => handlePaymentDecision(proof.booking_id, "MORE_PROOF_REQUESTED")}>
                        Request Proof
                      </Button>
                      <Button size="sm" variant="destructive" disabled={busy} onClick={() => handlePaymentDecision(proof.booking_id, "REJECTED")}>
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "bookings" && (
        <div className="space-y-4">
          <Input value={bookingQuery} onChange={(e) => setBookingQuery(e.target.value)} placeholder="Search by Booking Reference, email, or status..." className="max-w-md" />
          <div className="rounded-2xl border border-[#E4DFD7] bg-white overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E4DFD7] bg-[#F3EFEA] uppercase tracking-wider text-[#57534E]">
                <tr>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Payable</th>
                  <th className="p-3">Booking Status</th>
                  <th className="p-3">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DFD7] tabular-nums">
                {filteredBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="p-3 font-mono-ref font-semibold">{b.booking_reference}</td>
                    <td className="p-3">{b.customer?.email}</td>
                    <td className="p-3">
                      {b.items[0]?.product_title_snapshot}
                      {b.items[0] && <span className="block text-[#8C857B]">{formatISTDate(b.items[0].start_date)} – {formatISTDate(b.items[0].end_date)}</span>}
                    </td>
                    <td className="p-3 font-semibold">{formatINR(b.total_payable)}</td>
                    <td className="p-3"><Badge>{b.status}</Badge></td>
                    <td className="p-3">{b.payment_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "deposits" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#E4DFD7] bg-white overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E4DFD7] bg-[#F3EFEA] uppercase tracking-wider text-[#57534E]">
                <tr>
                  <th className="p-3">Booking</th>
                  <th className="p-3">Held</th>
                  <th className="p-3">Deduction</th>
                  <th className="p-3">Refunded</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DFD7] tabular-nums">
                {deposits.map((d) => (
                  <tr key={d.id}>
                    <td className="p-3 font-mono-ref">{d.booking?.booking_reference}</td>
                    <td className="p-3">{formatINR(d.amount_held)}</td>
                    <td className="p-3 text-[#9E2A2B]">{formatINR(d.deduction_amount)}</td>
                    <td className="p-3 text-[#2F5D46]">{formatINR(d.refund_amount)}</td>
                    <td className="p-3"><Badge>{d.status}</Badge></td>
                    <td className="p-3">
                      {["HELD", "REFUND_PENDING"].includes(d.status) && (
                        <Button size="sm" variant="subtle" onClick={() => setRefundBookingId(d.booking_id)}>Process Refund</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {refundBookingId && (
            <form onSubmit={handleProcessRefund} className="rounded-2xl border border-[#161616] bg-white p-6 space-y-4 max-w-xl">
              <h3 className="font-editorial text-2xl font-semibold">Record Deposit Refund</h3>
              <Input required value={refundRef} onChange={(e) => setRefundRef(e.target.value)} placeholder="UPI Refund Reference *" />
              <Input type="number" min={0} value={deductionAmt} onChange={(e) => setDeductionAmt(e.target.value)} placeholder="Deduction (₹)" />
              {Number(deductionAmt) > 0 && (
                <Textarea required value={deductionReason} onChange={(e) => setDeductionReason(e.target.value)} placeholder="Documented deduction reason *" />
              )}
              <div className="flex gap-2">
                <Button type="submit" variant="accent" disabled={busy}>Confirm Refund</Button>
                <Button type="button" variant="subtle" onClick={() => setRefundBookingId(null)}>Cancel</Button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === "payouts" && (
        <div className="rounded-2xl border border-[#E4DFD7] bg-white overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E4DFD7] bg-[#F3EFEA] uppercase tracking-wider text-[#57534E]">
              <tr>
                <th className="p-3">Seller</th>
                <th className="p-3">UPI ID</th>
                <th className="p-3">Booking</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4DFD7] tabular-nums">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 font-medium">{p.seller?.display_name}</td>
                  <td className="p-3 font-mono-ref">{p.seller?.payout_upi_id || "—"}</td>
                  <td className="p-3 font-mono-ref">{p.booking?.booking_reference}</td>
                  <td className="p-3 font-semibold">{formatINR(p.amount)}</td>
                  <td className="p-3"><Badge>{p.status}</Badge></td>
                  <td className="p-3 flex items-center gap-2">
                    <Input value={payoutRefs[p.id] ?? p.payout_reference ?? ""} onChange={(e) => setPayoutRefs({ ...payoutRefs, [p.id]: e.target.value })} placeholder="UTR / Ref" className="h-9 w-36" />
                    <Button size="sm" variant="accent" disabled={busy} onClick={() => handlePayoutUpdate(p.id, "PAID")}>Mark Paid</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "disputes" && (
        <div className="space-y-4">
          {disputes.map((d) => (
            <div key={d.id} className="rounded-2xl border border-[#E4DFD7] bg-white p-5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{d.booking?.booking_reference} · {d.dispute_type.replace(/_/g, " ")}</span>
                <Badge variant={d.status === "RESOLVED" ? "success" : "danger"}>{d.status}</Badge>
              </div>
              <p className="text-[#57534E]">{d.description}</p>
              {d.status !== "RESOLVED" && (
                <Button
                  size="sm"
                  variant="accent"
                  onClick={async () => {
                    await apiFetch("/api/admin/disputes", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ dispute_id: d.id, status: "RESOLVED", resolution_notes: "Resolved by admin review." }),
                    });
                    router.refresh();
                  }}
                >
                  Resolve Dispute
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="rounded-2xl border border-[#E4DFD7] bg-white overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E4DFD7] bg-[#F3EFEA] uppercase tracking-wider text-[#57534E]">
              <tr>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4DFD7]">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3"><Badge>{u.role}</Badge></td>
                  <td className="p-3">{u.status}</td>
                  <td className="p-3">
                    {u.role !== "ADMIN" && (
                      <Button
                        size="sm"
                        variant={u.status === "ACTIVE" ? "destructive" : "subtle"}
                        disabled={busy}
                        onClick={() => handleToggleUser(u.id, u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                      >
                        {u.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "cms" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form onSubmit={handleSaveSettings} className="lg:col-span-7 rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-4">
            <h2 className="font-editorial text-2xl font-semibold">Platform &amp; UPI Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input value={settingsForm.brand_name} onChange={(e) => setSettingsForm({ ...settingsForm, brand_name: e.target.value })} placeholder="Brand Name" />
              <Input type="number" step="0.5" value={settingsForm.commission_percent} onChange={(e) => setSettingsForm({ ...settingsForm, commission_percent: e.target.value })} placeholder="Commission (%)" />
              <Input type="number" value={settingsForm.reservation_hold_minutes} onChange={(e) => setSettingsForm({ ...settingsForm, reservation_hold_minutes: e.target.value })} placeholder="Hold Minutes" />
              <Input type="number" value={settingsForm.cleaning_buffer_days} onChange={(e) => setSettingsForm({ ...settingsForm, cleaning_buffer_days: e.target.value })} placeholder="Buffer Days" />
              <Input value={settingsForm.upi_id} onChange={(e) => setSettingsForm({ ...settingsForm, upi_id: e.target.value })} placeholder="UPI ID" />
              <Input value={settingsForm.upi_display_name} onChange={(e) => setSettingsForm({ ...settingsForm, upi_display_name: e.target.value })} placeholder="UPI Display Name" />
              <Input value={settingsForm.upi_qr_url} onChange={(e) => setSettingsForm({ ...settingsForm, upi_qr_url: e.target.value })} placeholder="UPI QR Image URL" />
              <Input value={settingsForm.whatsapp_number} onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_number: e.target.value })} placeholder="WhatsApp Number (91...)" />
            </div>
            <Textarea value={settingsForm.payment_instructions} onChange={(e) => setSettingsForm({ ...settingsForm, payment_instructions: e.target.value })} />
            <Button type="submit" variant="accent" disabled={busy}>Save Platform Settings</Button>
          </form>

          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-4">
              <h3 className="font-editorial text-xl font-semibold">Manage Categories</h3>
              <div className="flex gap-2">
                <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="New Category Name" />
                <Button
                  type="button"
                  variant="accent"
                  onClick={async () => {
                    if (!newCatName.trim()) return;
                    await apiFetch("/api/admin/categories", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: newCatName.trim() }),
                    });
                    setNewCatName("");
                    router.refresh();
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <span key={c.id} className="rounded-full border border-[#E4DFD7] px-3 py-1 text-xs flex items-center gap-2">
                    {c.name}
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/categories/${c.id}`, { method: "DELETE" });
                        router.refresh();
                      }}
                      className="text-[#9E2A2B]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-3">
              <h3 className="font-editorial text-xl font-semibold">Editable Draft Policies</h3>
              <Select
                value={selectedPolicySlug}
                onChange={(e) => {
                  const slug = e.target.value;
                  setSelectedPolicySlug(slug);
                  const found = policies.find((p) => p.slug === slug);
                  setPolicyContent(found?.content_markdown || "");
                }}
              >
                {policies.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
              </Select>
              <Textarea value={policyContent} onChange={(e) => setPolicyContent(e.target.value)} className="min-h-[160px]" />
              <Button
                type="button"
                size="sm"
                variant="accent"
                onClick={async () => {
                  if (!selectedPolicy) return;
                  await apiFetch("/api/admin/policies", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      slug: selectedPolicy.slug,
                      title: selectedPolicy.title,
                      content_markdown: policyContent,
                      requires_legal_review: true,
                    }),
                  });
                  setStatusMsg("Policy draft updated.");
                  router.refresh();
                }}
              >
                Save Policy Draft
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
