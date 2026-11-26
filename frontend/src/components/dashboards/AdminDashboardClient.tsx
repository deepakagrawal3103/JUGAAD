"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ExternalLink, MessageSquare, Star, Flame, ShieldCheck, Ban, Plus, Phone, Mail, MessageCircle, Eye, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiFetch, getApiUrl } from "@/lib/api/client";
import { formatINR } from "@/lib/utils";
import { formatISTDate, formatISTDateTime } from "@/lib/domain/dates";
import { EventDashboardBanner } from "@/components/dashboards/EventDashboardBanner";
import { createClient } from "@/lib/supabase/client";
import type { AdminSettingsRecord, CategoryRecord } from "@/types/database";

type AdminTab =
  | "overview"
  | "listings"
  | "payments"
  | "bookings"
  | "deposits"
  | "payouts"
  | "sellers"
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
  sellers?: Array<{
    id: string;
    display_name: string;
    email?: string | null;
    phone?: string | null;
    bio?: string | null;
    city: string;
    locality?: string | null;
    pickup_address?: string | null;
    verification_status: string;
    payout_upi_id?: string | null;
    payout_account_name?: string | null;
    total_rentals?: number;
    rating_avg?: number;
    user?: { email?: string | null; phone?: string | null; status?: string | null } | null;
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

const BOOKING_STATUSES = [
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
];

export function AdminDashboardClient({
  metrics,
  listings,
  paymentQueue,
  bookings,
  deposits,
  payouts,
  sellers = [],
  disputes,
  users,
  categories,
  policies,
  settings,
}: AdminProps) {
  const router = useRouter();
  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // The local demo session has no Supabase browser session to sign out.
    }
    await fetch("/api/auth/demo-session", { method: "DELETE" }).catch(() => {});
    router.replace("/admin/login");
    router.refresh();
  };
  const [tab, setTab] = useState<AdminTab>("overview");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reactive local state so all controls work seamlessly in both live Supabase & local demo mode
  const [listingsState, setListingsState] = useState(listings);
  const [listingFilter, setListingFilter] = useState<string>("ALL");
  const [paymentQueueState, setPaymentQueueState] = useState(paymentQueue);
  const [bookingsState, setBookingsState] = useState(bookings);
  const [depositsState, setDepositsState] = useState(deposits);
  const [payoutsState, setPayoutsState] = useState(payouts);
  const [sellersState, setSellersState] = useState(sellers);
  const [disputesState, setDisputesState] = useState(disputes);
  const [usersState, setUsersState] = useState(users);
  const [categoriesState, setCategoriesState] = useState(categories);
  const [policiesState, setPoliciesState] = useState(policies);

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});
  const [bookingQuery, setBookingQuery] = useState("");
  const [refundBookingId, setRefundBookingId] = useState<string | null>(null);
  const [refundRef, setRefundRef] = useState("");
  const [deductionAmt, setDeductionAmt] = useState("0");
  const [deductionReason, setDeductionReason] = useState("");
  const [payoutRefs, setPayoutRefs] = useState<Record<string, string>>({});
  const [selectedSeller, setSelectedSeller] = useState<NonNullable<AdminProps["sellers"]>[number] | null>(null);
  const [showAddSeller, setShowAddSeller] = useState(false);
  const [newSellerForm, setNewSellerForm] = useState({
    display_name: "",
    email: "",
    phone: "",
    city: "",
    locality: "",
    pickup_address: "",
    payout_upi_id: "",
    payout_account_name: "",
    bio: "",
  });

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
  const selectedPolicy = policiesState.find((p) => p.slug === selectedPolicySlug);
  const [policyContent, setPolicyContent] = useState(selectedPolicy?.content_markdown || "");

  const tryApi = async (url: string, init: RequestInit): Promise<{ ok: boolean; data: any }> => {
    try {
      const res = await apiFetch(url, init);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data };
    } catch {
      return { ok: false, data: {} };
    }
  };

  const handleListingAction = async (
    id: string,
    action: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "PAUSED" | "UNPUBLISHED",
    extra?: { is_featured?: boolean; is_trending?: boolean }
  ) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const { ok, data } = await tryApi(`/api/admin/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: reviewNotes[id] || null, ...extra }),
      });
      if (!ok) {
        setStatusMsg(`ERROR: ${data.error || "Listing save nahi hui. Koi change persist nahi hua."}`);
        return;
      }
      const nextStatus = action === "UNPUBLISHED" ? "PAUSED" : action;
      setListingsState((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: nextStatus,
                is_featured: typeof extra?.is_featured === "boolean" ? extra.is_featured : item.is_featured,
                is_trending: typeof extra?.is_trending === "boolean" ? extra.is_trending : item.is_trending,
              }
            : item
        )
      );
      setStatusMsg(`Listing updated (${nextStatus}).`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleListingFlag = async (
    item: AdminProps["listings"][number],
    flag: "is_featured" | "is_trending"
  ) => {
    const nextVal = !item[flag];
    await handleListingAction(
      item.id,
      (item.status === "APPROVED" || item.status === "PAUSED" || item.status === "REJECTED"
        ? item.status
        : "APPROVED") as "APPROVED",
      { [flag]: nextVal }
    );
  };

  const handlePaymentDecision = async (
    bookingId: string,
    decision: "VERIFIED" | "REJECTED" | "MORE_PROOF_REQUESTED"
  ) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const { ok, data } = await tryApi(`/api/admin/payments/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: paymentNotes[bookingId] || null }),
      });
      if (!ok) {
        setStatusMsg(`ERROR: ${data.error || "Payment update nahi hui. Booking abhi confirm nahi hui."}`);
        return;
      }
      setPaymentQueueState((prev) =>
        prev.map((p) => (p.booking_id === bookingId ? { ...p, review_status: decision } : p))
      );
      if (decision === "VERIFIED") {
        setBookingsState((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, status: "CONFIRMED", payment_status: "VERIFIED" } : b
          )
        );
      }
      setStatusMsg(`Payment marked ${decision}.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleBookingStatusChange = async (bookingId: string, nextStatus: string) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const { ok, data } = await tryApi(`/api/admin/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!ok) {
        setStatusMsg(`ERROR: ${data.error || "Booking status update nahi hua."}`);
        return;
      }
      setBookingsState((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: nextStatus } : b))
      );
      setStatusMsg(`Booking status updated to "${nextStatus}".`);
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
      const deduction = Number(deductionAmt || 0);
      const { ok, data } = await tryApi("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: refundBookingId,
          deduction_amount: deduction,
          deduction_reason: deductionReason || null,
          refund_reference: refundRef,
        }),
      });
      if (!ok) {
        setStatusMsg(`ERROR: ${data.error || "Refund record save nahi hua. Deposit status unchanged hai."}`);
        return;
      }
      setDepositsState((prev) =>
        prev.map((d) => {
          if (d.booking_id !== refundBookingId) return d;
          const held = Number(d.amount_held || 0);
          const refunded = Math.max(0, held - deduction);
          return {
            ...d,
            amount_held: 0,
            deduction_amount: deduction,
            refund_amount: refunded,
            status: refunded === 0 ? "FORFEITED" : deduction > 0 ? "PARTIALLY_REFUNDED" : "REFUNDED",
          };
        })
      );
      setStatusMsg("Deposit refund processed.");
      setRefundBookingId(null);
      setRefundRef("");
      setDeductionAmt("0");
      setDeductionReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handlePayoutUpdate = async (payoutId: string, status: string) => {
    setBusy(true);
    try {
      const ref = payoutRefs[payoutId] || null;
      const { ok, data } = await tryApi("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout_id: payoutId, status, payout_reference: ref }),
      });
      if (!ok) {
        setStatusMsg(`ERROR: ${data.error || "Payout update save nahi hua."}`);
        return;
      }
      setPayoutsState((prev) =>
        prev.map((p) => (p.id === payoutId ? { ...p, status, payout_reference: ref ?? p.payout_reference } : p))
      );
      setStatusMsg(`Payout marked ${status}.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleSellerUpdate = async (sellerId: string, verificationStatus: "VERIFIED" | "PENDING" | "SUSPENDED") => {
    setBusy(true);
    try {
      const { ok, data } = await tryApi("/api/admin/sellers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seller_id: sellerId, verification_status: verificationStatus }),
      });
      if (!ok) {
        setStatusMsg(`ERROR: ${data.error || "Seller approval save nahi hui."}`);
        return;
      }
      setSellersState((prev) =>
        prev.map((s) => (s.id === sellerId ? { ...s, verification_status: verificationStatus } : s))
      );
      if (selectedSeller?.id === sellerId) {
        setSelectedSeller((prev) => (prev ? { ...prev, verification_status: verificationStatus } : null));
      }
      setStatusMsg(`Seller status updated to ${verificationStatus}.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatusMsg(null);
    try {
      const { ok, data } = await tryApi("/api/admin/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSellerForm),
      });
      if (!ok) {
        setStatusMsg(data.error || "Naya Seller create nahi hua.");
        return;
      }
      const created = data?.seller ?? {
        id: `sel-${Date.now()}`,
        ...newSellerForm,
        verification_status: "VERIFIED",
        total_rentals: 0,
        rating_avg: 0,
      };
      setSellersState((prev) => [created, ...prev]);
      setNewSellerForm({
        display_name: "",
        email: "",
        phone: "",
        city: "",
        locality: "",
        pickup_address: "",
        payout_upi_id: "",
        payout_account_name: "",
        bio: "",
      });
      setShowAddSeller(false);
      setStatusMsg(`New Seller "${created.display_name}" created and verified.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleUser = async (userId: string, nextStatus: "ACTIVE" | "SUSPENDED") => {
    setBusy(true);
    try {
      const { ok, data } = await tryApi("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, status: nextStatus }),
      });
      if (!ok) { setStatusMsg(`ERROR: ${data.error || "User status save nahi hua."}`); return; }
      setUsersState((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
      );
      setStatusMsg(`User status updated to ${nextStatus}.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleUserRoleChange = async (userId: string, nextRole: "CUSTOMER" | "SELLER" | "ADMIN") => {
    setBusy(true);
    try {
      const { ok, data } = await tryApi("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role: nextRole }),
      });
      if (!ok) { setStatusMsg(`ERROR: ${data.error || "User role save nahi hua."}`); return; }
      setUsersState((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
      );
      setStatusMsg(`User role updated to ${nextRole}.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { ok, data } = await tryApi("/api/admin/settings", {
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
      if (!ok) { setStatusMsg(`ERROR: ${data.error || "Could not save settings."}`); return; }
      setStatusMsg("Platform settings saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const filteredListings = listingsState.filter((l) =>
    listingFilter === "ALL" ? true : l.status === listingFilter
  );

  const filteredBookings = bookingsState.filter((b) => {
    if (!bookingQuery.trim()) return true;
    const q = bookingQuery.toLowerCase();
    return (
      b.booking_reference.toLowerCase().includes(q) ||
      (b.customer?.email || "").toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q)
    );
  });

  const pendingListingsCount = listingsState.filter((l) => l.status === "PENDING_REVIEW").length;
  const pendingPaymentsCount = paymentQueueState.filter((p) => p.review_status === "PENDING").length;
  const openDisputesCount = disputesState.filter((d) => ["OPEN", "UNDER_REVIEW"].includes(d.status)).length;

  const TABS: { key: AdminTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "listings", label: `Listings (${pendingListingsCount} Pending)` },
    { key: "payments", label: `Payments (${pendingPaymentsCount} Pending)` },
    { key: "bookings", label: `Bookings (${bookingsState.length})` },
    { key: "deposits", label: "Deposits & Refunds" },
    { key: "payouts", label: "Seller Payouts" },
    { key: "sellers", label: `Sellers (${sellersState.length})` },
    { key: "disputes", label: `Disputes (${openDisputesCount})` },
    { key: "users", label: `Users (${usersState.length})` },
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
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
              tab === t.key ? "border-[#EB5E4C] bg-[#FDECE9] text-[#D94E3D]" : "border-[#E4DFD7] bg-white text-[#57534E] hover:border-[#161616]"
            }`}
          >
            {t.label}
          </button>
        ))}
        <Button type="button" variant="outline" onClick={handleLogout} className="ml-auto gap-2">
          <LogOut className="h-3.5 w-3.5" /> Logout
        </Button>
      </div>

      {statusMsg && (
        <div className={`rounded-xl border px-4 py-3 text-xs font-medium flex items-center justify-between ${statusMsg.startsWith("ERROR:") ? "border-[#E6C5C5] bg-[#FDF1F1] text-[#9E2A2B]" : "border-[#C4DACB] bg-[#EDF5F0] text-[#2F5D46]"}`}>
          <span>{statusMsg}</span>
          <button type="button" onClick={() => setStatusMsg(null)} className="underline text-[11px]">Dismiss</button>
        </div>
      )}

      {tab === "overview" && (
        <div className="space-y-6">
          <EventDashboardBanner role="admin" onAction={() => setTab("sellers")} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Users", val: usersState.length || metrics.totalUsers, goto: "users" as AdminTab },
              { label: "Total Sellers", val: sellersState.length || metrics.totalSellers, goto: "sellers" as AdminTab },
              { label: "Live Listings", val: listingsState.filter((l) => l.status === "APPROVED").length || metrics.activeListings, goto: "listings" as AdminTab },
              { label: "Pending Approval", val: pendingListingsCount, goto: "listings" as AdminTab },
              { label: "Total Bookings", val: bookingsState.length || metrics.totalBookings, goto: "bookings" as AdminTab },
              { label: "Confirmed Bookings", val: metrics.confirmedBookings, goto: "bookings" as AdminTab },
              { label: "Active Rentals", val: bookingsState.filter((b) => b.status === "RENTAL_ACTIVE").length || metrics.activeRentals, goto: "bookings" as AdminTab },
              { label: "Payment Queue", val: pendingPaymentsCount, goto: "payments" as AdminTab },
              { label: "Rental Volume", val: formatINR(metrics.rentalVolume), goto: "bookings" as AdminTab },
              { label: "Platform Commission", val: formatINR(metrics.platformCommission), goto: "payouts" as AdminTab },
              { label: "Seller Earnings", val: formatINR(metrics.sellerEarnings), goto: "payouts" as AdminTab },
              { label: "Deposits Held", val: formatINR(metrics.depositsHeld), goto: "deposits" as AdminTab },
              { label: "Refunds Pending", val: metrics.refundsPending, goto: "deposits" as AdminTab },
              { label: "Returns Pending", val: metrics.returnsPending, goto: "bookings" as AdminTab },
              { label: "Open Disputes", val: openDisputesCount, goto: "disputes" as AdminTab },
            ].map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={() => setTab(m.goto)}
                className="text-left rounded-2xl border border-[#E4DFD7] bg-white p-5 hover:border-[#EB5E4C] transition-colors"
              >
                <p className="text-[11px] uppercase tracking-wider text-[#8C857B]">{m.label}</p>
                <p className="font-editorial text-2xl font-semibold mt-1 tabular-nums">{m.val}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "listings" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "ALL", label: "All" },
              { key: "PENDING_REVIEW", label: "Pending Approval" },
              { key: "APPROVED", label: "Live / Approved" },
              { key: "CHANGES_REQUESTED", label: "Changes Requested" },
              { key: "PAUSED", label: "Paused" },
              { key: "REJECTED", label: "Rejected" },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setListingFilter(f.key)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium border ${
                  listingFilter === f.key ? "border-[#161616] bg-[#161616] text-white" : "border-[#E4DFD7] bg-white text-[#57534E]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredListings.map((item) => {
            const img = item.images?.find((i) => i.is_primary)?.public_url || item.images?.[0]?.public_url;
            return (
              <div key={item.id} className="rounded-2xl border border-[#E4DFD7] bg-white p-5 space-y-4">
                <div className="flex flex-wrap gap-4 justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-16 h-20 rounded-xl border border-[#E4DFD7] bg-[#F3EFEA] shrink-0 overflow-hidden">
                      {img && <img src={img} alt={item.title} className="h-full w-full object-cover" />}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={item.status === "APPROVED" ? "success" : item.status === "REJECTED" ? "danger" : "warning"}>
                          {item.status}
                        </Badge>
                        {item.is_featured && <Badge variant="coral">Featured</Badge>}
                        {item.is_trending && <Badge variant="coral">Trending</Badge>}
                        <span className="text-[#8C857B]">{item.category?.name} · {item.condition}</span>
                      </div>
                      <p className="text-sm font-semibold text-[#161616]">{item.title} ({item.brand})</p>
                      <p className="text-[#57534E]">Seller: {item.seller?.display_name} ({item.seller?.city})</p>
                      <p className="tabular-nums">Rent: <strong>{formatINR(item.daily_price)}/day</strong> · Deposit: <strong>{formatINR(item.security_deposit)}</strong></p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={item.is_featured ? "accent" : "subtle"}
                      disabled={busy}
                      onClick={() => handleToggleListingFlag(item, "is_featured")}
                    >
                      <Star className="h-3.5 w-3.5" /> {item.is_featured ? "Featured ✓" : "Mark Featured"}
                    </Button>
                    <Button
                      size="sm"
                      variant={item.is_trending ? "accent" : "subtle"}
                      disabled={busy}
                      onClick={() => handleToggleListingFlag(item, "is_trending")}
                    >
                      <Flame className="h-3.5 w-3.5" /> {item.is_trending ? "Trending ✓" : "Mark Trending"}
                    </Button>
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
                      <MessageSquare className="h-3.5 w-3.5" /> Request Changes
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
          {paymentQueueState.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D6CFC5] bg-white p-12 text-center text-sm text-[#8C857B]">
              No payment proofs submitted yet.
            </div>
          ) : (
            paymentQueueState.map((proof) => (
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
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status Override (Admin Control)</th>
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
                    <td className="p-3"><Badge>{b.payment_status}</Badge></td>
                    <td className="p-3">
                      <select
                        value={b.status}
                        disabled={busy}
                        onChange={(e) => handleBookingStatusChange(b.id, e.target.value)}
                        className="h-9 rounded-lg border border-[#E4DFD7] bg-white px-2 text-xs font-medium"
                      >
                        {BOOKING_STATUSES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </td>
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
                {depositsState.map((d) => (
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
                <th className="p-3">Reference &amp; Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4DFD7] tabular-nums">
              {payoutsState.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 font-medium">{p.seller?.display_name}</td>
                  <td className="p-3 font-mono-ref">{p.seller?.payout_upi_id || "—"}</td>
                  <td className="p-3 font-mono-ref">{p.booking?.booking_reference}</td>
                  <td className="p-3 font-semibold">{formatINR(p.amount)}</td>
                  <td className="p-3"><Badge variant={p.status === "PAID" ? "success" : "warning"}>{p.status}</Badge></td>
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

      {tab === "sellers" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-editorial text-2xl font-semibold text-[#161616]">Sellers &amp; Boutiques Management</h2>
              <p className="text-xs text-[#57534E]">Create new seller accounts, verify or suspend sellers, and contact them directly.</p>
            </div>
            <Button variant="accent" size="sm" onClick={() => setShowAddSeller(!showAddSeller)}>
              <Plus className="h-4 w-4" /> {showAddSeller ? "Close Form" : "Create Seller Account"}
            </Button>
          </div>

          {showAddSeller && (
            <form onSubmit={handleCreateSeller} className="rounded-2xl border border-[#161616] bg-white p-6 space-y-4">
              <h3 className="font-editorial text-xl font-semibold">Create New Seller Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input required value={newSellerForm.display_name} onChange={(e) => setNewSellerForm({ ...newSellerForm, display_name: e.target.value })} placeholder="Boutique / Closet Name *" />
                <Input type="email" required value={newSellerForm.email} onChange={(e) => setNewSellerForm({ ...newSellerForm, email: e.target.value })} placeholder="Seller Email *" />
                <Input required value={newSellerForm.phone} onChange={(e) => setNewSellerForm({ ...newSellerForm, phone: e.target.value })} placeholder="Phone / WhatsApp (+91...) *" />
                <Input required value={newSellerForm.city} onChange={(e) => setNewSellerForm({ ...newSellerForm, city: e.target.value })} placeholder="City *" />
                <Input value={newSellerForm.locality} onChange={(e) => setNewSellerForm({ ...newSellerForm, locality: e.target.value })} placeholder="Locality / Area" />
                <Input required value={newSellerForm.payout_upi_id} onChange={(e) => setNewSellerForm({ ...newSellerForm, payout_upi_id: e.target.value })} placeholder="Payout UPI ID *" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input required value={newSellerForm.payout_account_name} onChange={(e) => setNewSellerForm({ ...newSellerForm, payout_account_name: e.target.value })} placeholder="Bank / UPI Account Holder Name *" />
                <Input required value={newSellerForm.pickup_address} onChange={(e) => setNewSellerForm({ ...newSellerForm, pickup_address: e.target.value })} placeholder="Pickup Address *" />
              </div>
              <Textarea value={newSellerForm.bio} onChange={(e) => setNewSellerForm({ ...newSellerForm, bio: e.target.value })} placeholder="Boutique Bio (Optional)" />
              <div className="flex gap-2">
                <Button type="submit" variant="accent" disabled={busy}>Create Seller Account</Button>
                <Button type="button" variant="subtle" onClick={() => setShowAddSeller(false)}>Cancel</Button>
              </div>
            </form>
          )}

          <div className="rounded-2xl border border-[#E4DFD7] bg-white overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E4DFD7] bg-[#F3EFEA] uppercase tracking-wider text-[#57534E]">
                <tr>
                  <th className="p-3">Closet / Boutique</th>
                  <th className="p-3">City</th>
                  <th className="p-3">Contact &amp; UPI</th>
                  <th className="p-3">Rentals</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Admin Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DFD7]">
                {sellersState.map((s) => {
                  const sEmail = s.email || s.user?.email || "—";
                  const sPhone = s.phone || s.user?.phone || "—";
                  return (
                    <tr key={s.id}>
                      <td className="p-3 font-semibold">{s.display_name}</td>
                      <td className="p-3">{s.city}{s.locality ? `, ${s.locality}` : ""}</td>
                      <td className="p-3">
                        <span className="block font-mono-ref">{sPhone}</span>
                        <span className="block text-[#8C857B]">{s.payout_upi_id || sEmail}</span>
                      </td>
                      <td className="p-3 tabular-nums">{s.total_rentals ?? 0}</td>
                      <td className="p-3">
                        <Badge variant={s.verification_status === "VERIFIED" ? "success" : s.verification_status === "SUSPENDED" ? "danger" : "warning"}>
                          {s.verification_status}
                        </Badge>
                      </td>
                      <td className="p-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="subtle" onClick={() => setSelectedSeller(s)}>
                          <Eye className="h-3.5 w-3.5" /> Profile &amp; Contact
                        </Button>
                        {s.verification_status !== "VERIFIED" && (
                          <Button size="sm" variant="accent" disabled={busy} onClick={() => handleSellerUpdate(s.id, "VERIFIED")}>
                            <ShieldCheck className="h-3.5 w-3.5" /> Verify Seller
                          </Button>
                        )}
                        {s.verification_status !== "SUSPENDED" ? (
                          <Button size="sm" variant="destructive" disabled={busy} onClick={() => handleSellerUpdate(s.id, "SUSPENDED")}>
                            <Ban className="h-3.5 w-3.5" /> Suspend
                          </Button>
                        ) : (
                          <Button size="sm" variant="subtle" disabled={busy} onClick={() => handleSellerUpdate(s.id, "VERIFIED")}>
                            Reactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedSeller && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedSeller(null)}>
              <div className="bg-white rounded-2xl border border-[#E4DFD7] max-w-lg w-full p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-[#E4DFD7] pb-4">
                  <div>
                    <Badge variant={selectedSeller.verification_status === "VERIFIED" ? "success" : selectedSeller.verification_status === "SUSPENDED" ? "danger" : "warning"}>
                      {selectedSeller.verification_status}
                    </Badge>
                    <h3 className="font-editorial text-2xl font-semibold mt-1">{selectedSeller.display_name}</h3>
                    <p className="text-xs text-[#57534E]">
                      {selectedSeller.city}{selectedSeller.locality ? `, ${selectedSeller.locality}` : ""} · {selectedSeller.total_rentals ?? 0} rentals
                    </p>
                  </div>
                  <button type="button" onClick={() => setSelectedSeller(null)} className="p-1 text-[#8C857B] hover:text-[#161616]">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {selectedSeller.bio && <p className="text-xs text-[#57534E] leading-relaxed">{selectedSeller.bio}</p>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#FAF8F5] p-4 rounded-xl border border-[#E4DFD7]">
                  <div>
                    <span className="text-[#8C857B] block">Email</span>
                    <span className="font-medium break-all">{selectedSeller.email || selectedSeller.user?.email || "Not provided"}</span>
                  </div>
                  <div>
                    <span className="text-[#8C857B] block">Phone / WhatsApp</span>
                    <span className="font-mono-ref font-medium">{selectedSeller.phone || selectedSeller.user?.phone || "Not provided"}</span>
                  </div>
                  <div>
                    <span className="text-[#8C857B] block">Payout UPI ID</span>
                    <span className="font-mono-ref font-medium">{selectedSeller.payout_upi_id || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[#8C857B] block">Account Holder</span>
                    <span className="font-medium">{selectedSeller.payout_account_name || "—"}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[#8C857B] block">Private Pickup Address</span>
                    <span className="font-medium">{selectedSeller.pickup_address || "—"}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(selectedSeller.phone || selectedSeller.user?.phone) && (
                    <>
                      <a
                        href={`tel:${(selectedSeller.phone || selectedSeller.user?.phone || "").replace(/\s+/g, "")}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#161616] text-white px-4 py-2 text-xs font-medium"
                      >
                        <Phone className="h-3.5 w-3.5" /> Call Seller
                      </a>
                      <a
                        href={`https://wa.me/${(selectedSeller.phone || selectedSeller.user?.phone || "").replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#2F5D46] text-white px-4 py-2 text-xs font-medium"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Seller
                      </a>
                    </>
                  )}
                  {(selectedSeller.email || selectedSeller.user?.email) && (
                    <a
                      href={`mailto:${selectedSeller.email || selectedSeller.user?.email}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4DFD7] px-4 py-2 text-xs font-medium hover:border-[#161616]"
                    >
                      <Mail className="h-3.5 w-3.5" /> Send Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "disputes" && (
        <div className="space-y-4">
          {disputesState.map((d) => (
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
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const { ok, data } = await tryApi("/api/admin/disputes", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ dispute_id: d.id, status: "RESOLVED", resolution_notes: "Resolved by admin." }),
                      });
                      if (!ok) { setStatusMsg(`ERROR: ${data.error || "Dispute update save nahi hua."}`); return; }
                      setDisputesState((prev) =>
                        prev.map((row) => (row.id === d.id ? { ...row, status: "RESOLVED" } : row))
                      );
                      setStatusMsg("Dispute resolved.");
                      router.refresh();
                    } finally {
                      setBusy(false);
                    }
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
              {usersState.map((u) => (
                <tr key={u.id}>
                  <td className="p-3 font-medium">{u.email}</td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      disabled={busy}
                      onChange={(e) => handleUserRoleChange(u.id, e.target.value as "CUSTOMER" | "SELLER" | "ADMIN")}
                      className="h-8 rounded-lg border border-[#E4DFD7] bg-white px-2 text-xs font-medium"
                    >
                      <option value="CUSTOMER">CUSTOMER</option>
                      <option value="SELLER">SELLER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <Badge variant={u.status === "ACTIVE" ? "success" : "danger"}>{u.status}</Badge>
                  </td>
                  <td className="p-3">
                    {u.role !== "ADMIN" && (
                      <Button
                        size="sm"
                        variant={u.status === "ACTIVE" ? "destructive" : "subtle"}
                        disabled={busy}
                        onClick={() => handleToggleUser(u.id, u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                      >
                        {u.status === "ACTIVE" ? "Suspend" : "Activate"}
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
            <Button type="submit" variant="accent" disabled={busy}>Save Settings</Button>
          </form>

          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-4">
              <h3 className="font-editorial text-xl font-semibold">Manage Categories</h3>
              <div className="flex gap-2">
                <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="New Category Name" />
                <Button
                  type="button"
                  variant="accent"
                  disabled={busy}
                  onClick={async () => {
                    if (!newCatName.trim()) return;
                    const name = newCatName.trim();
                    const { ok, data } = await tryApi("/api/admin/categories", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name }),
                    });
                    if (!ok) { setStatusMsg(`ERROR: ${data.error || "Category add nahi hui."}`); return; }
                    const newCat = data?.category ?? {
                      id: `cat-${Date.now()}`,
                      name,
                      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                      display_order: categoriesState.length + 1,
                      is_active: true,
                    };
                    setCategoriesState((prev) => [...prev, newCat]);
                    setNewCatName("");
                    setStatusMsg(`Category "${name}" added.`);
                    router.refresh();
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categoriesState.map((c) => (
                  <span key={c.id} className="rounded-full border border-[#E4DFD7] px-3 py-1 text-xs flex items-center gap-2">
                    {c.name}
                    <button
                      type="button"
                      onClick={async () => {
                        const { ok, data } = await tryApi(`/api/admin/categories/${c.id}`, { method: "DELETE" });
                        if (!ok) { setStatusMsg(`ERROR: ${data.error || "Category delete nahi hui."}`); return; }
                        setCategoriesState((prev) => prev.filter((row) => row.id !== c.id));
                        setStatusMsg(`Category "${c.name}" removed.`);
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
              <h3 className="font-editorial text-xl font-semibold">Edit Policies</h3>
              <Select
                value={selectedPolicySlug}
                onChange={(e) => {
                  const slug = e.target.value;
                  setSelectedPolicySlug(slug);
                  const found = policiesState.find((p) => p.slug === slug);
                  setPolicyContent(found?.content_markdown || "");
                }}
              >
                {policiesState.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
              </Select>
              <Textarea value={policyContent} onChange={(e) => setPolicyContent(e.target.value)} className="min-h-[160px]" />
              <Button
                type="button"
                size="sm"
                variant="accent"
                disabled={busy}
                onClick={async () => {
                  if (!selectedPolicy) return;
                  const { ok, data } = await tryApi("/api/admin/policies", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      slug: selectedPolicy.slug,
                      title: selectedPolicy.title,
                      content_markdown: policyContent,
                      requires_legal_review: true,
                    }),
                  });
                  if (!ok) { setStatusMsg(`ERROR: ${data.error || "Policy save nahi hui."}`); return; }
                  setPoliciesState((prev) =>
                    prev.map((p) => (p.slug === selectedPolicy.slug ? { ...p, content_markdown: policyContent } : p))
                  );
                  setStatusMsg("Policy draft saved.");
                  router.refresh();
                }}
              >
                Save Policy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
