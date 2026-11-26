"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pause, Play, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api/client";
import { formatINR } from "@/lib/utils";
import { formatISTDate, formatISTDateTime } from "@/lib/domain/dates";
import { EventDashboardBanner } from "@/components/dashboards/EventDashboardBanner";
import { LISTING_STATUS_LABELS, type ListingStatus } from "@/types/database";

interface SellerListingRow {
  id: string;
  title: string;
  slug: string;
  brand: string;
  size: string;
  daily_price: number;
  security_deposit: number;
  status: ListingStatus;
  admin_feedback: string | null;
  rental_count: number;
  images?: { public_url: string; is_primary: boolean }[];
}

interface SellerBookingItemRow {
  id: string;
  booking_id: string;
  product_title_snapshot: string;
  start_date: string;
  end_date: string;
  rental_amount: number;
  commission_amount: number;
  seller_earnings: number;
  fulfillment_type: string;
  return_deadline: string;
  booking?: { id: string; booking_reference: string; status: string; payment_status: string } | null;
}

interface SellerPayoutRow {
  id: string;
  amount: number;
  status: string;
  payout_reference: string | null;
  created_at: string;
}

const LISTING_TABS = [
  { key: "ALL", label: "All Listings" },
  { key: "DRAFT", label: "Drafts" },
  { key: "PENDING_REVIEW", label: "Pending Approval" },
  { key: "CHANGES_REQUESTED", label: "Changes Requested" },
  { key: "APPROVED", label: "Live / Published" },
  { key: "PAUSED", label: "Paused" },
  { key: "REJECTED", label: "Rejected" },
];

export function SellerDashboardClient({
  listings,
  bookingItems,
  payouts,
}: {
  listings: SellerListingRow[];
  bookingItems: SellerBookingItemRow[];
  payouts: SellerPayoutRow[];
}) {
  const router = useRouter();
  const [section, setSection] = useState<"listings" | "bookings">("listings");
  const [listingTab, setListingTab] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [inspectBookingId, setInspectBookingId] = useState<string | null>(null);
  const [conditionStatus, setConditionStatus] = useState("GOOD");
  const [damageFound, setDamageFound] = useState(false);
  const [deductionRec, setDeductionRec] = useState("0");
  const [inspectNotes, setInspectNotes] = useState("");

  const verifiedItems = bookingItems.filter((i) => i.booking?.payment_status === "VERIFIED");
  const totalRentRevenue = verifiedItems.reduce((s, i) => s + Number(i.rental_amount), 0);
  const totalCommission = verifiedItems.reduce((s, i) => s + Number(i.commission_amount), 0);
  const netEarnings = verifiedItems.reduce((s, i) => s + Number(i.seller_earnings), 0);
  const pendingPayouts = payouts.filter((p) => p.status !== "PAID" && p.status !== "FAILED").reduce((s, p) => s + Number(p.amount), 0);
  const completedPayouts = payouts.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0);

  const toggleListingStatus = async (id: string, actionStatus: string) => {
    setBusyId(id);
    setFeedback(null);
    try {
      const res = await apiFetch(`/api/seller/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_status: actionStatus }),
      });
      const data = await res.json();
      if (!res.ok) setFeedback(data.error || "Could not update listing status.");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const deleteListing = async (id: string) => {
    setBusyId(id);
    try {
      await apiFetch(`/api/seller/listings/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const transitionBooking = async (bookingId: string, nextStatus: string) => {
    setBusyId(bookingId);
    setFeedback(null);
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next_status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) setFeedback(data.error || "Status update failed.");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const submitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectBookingId) return;
    setBusyId(inspectBookingId);
    try {
      const res = await apiFetch(`/api/bookings/${inspectBookingId}/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condition_status: conditionStatus,
          damage_found: damageFound,
          deduction_recommended: damageFound ? Number(deductionRec || 0) : 0,
          notes: inspectNotes,
          evidence_paths: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) setFeedback(data.error || "Failed to record inspection.");
      else {
        setInspectBookingId(null);
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const visibleListings = listings.filter((l) => (listingTab === "ALL" ? true : l.status === listingTab));

  return (
    <div className="space-y-8">
      <EventDashboardBanner role="seller" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E4DFD7] bg-white p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8C857B]">Total / Live</p>
          <p className="font-editorial text-2xl font-semibold mt-1">
            {listings.length} / {listings.filter((l) => l.status === "APPROVED").length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E4DFD7] bg-white p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8C857B]">Pending / Rejected</p>
          <p className="font-editorial text-2xl font-semibold mt-1">
            {listings.filter((l) => l.status === "PENDING_REVIEW").length} /{" "}
            {listings.filter((l) => l.status === "REJECTED").length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E4DFD7] bg-white p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8C857B]">Total Bookings</p>
          <p className="font-editorial text-2xl font-semibold mt-1 tabular-nums">{bookingItems.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4DFD7] pb-4">
        <div className="flex gap-2">
          {(["listings", "bookings"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wider border ${
                section === s ? "border-[#EB5E4C] bg-[#FDECE9] text-[#D94E3D]" : "border-[#E4DFD7] bg-white text-[#57534E]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <Link href="/seller/listings/new" className="inline-flex items-center gap-2 rounded-xl bg-[#EB5E4C] text-white px-5 py-2.5 text-xs font-semibold">
          <Plus className="h-4 w-4" /> New Listing
        </Link>
      </div>

      {feedback && (
        <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] p-3 text-xs text-[#9E2A2B]">{feedback}</div>
      )}

      {section === "listings" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {LISTING_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setListingTab(t.key)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium border ${
                  listingTab === t.key ? "border-[#161616] bg-[#161616] text-white" : "border-[#E4DFD7] bg-white text-[#57534E]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {visibleListings.length > 0 ? (
            <div className="space-y-3">
              {visibleListings.map((item) => {
                const img = item.images?.find((i) => i.is_primary)?.public_url || item.images?.[0]?.public_url;
                return (
                  <div key={item.id} className="rounded-2xl border border-[#E4DFD7] bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-18 rounded-xl border border-[#E4DFD7] bg-[#F3EFEA] shrink-0 overflow-hidden">
                        {img && <img src={img} alt={item.title} className="h-full w-full object-cover" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={item.status === "APPROVED" ? "success" : item.status === "REJECTED" ? "danger" : "warning"}>
                            {LISTING_STATUS_LABELS[item.status] || item.status}
                          </Badge>
                          <span className="text-xs text-[#8C857B]">{item.brand} · Size {item.size}</span>
                        </div>
                        <p className="font-semibold text-sm text-[#161616]">{item.title}</p>
                        <p className="text-xs text-[#57534E] tabular-nums">
                          Rent: {formatINR(item.daily_price)}/day · Deposit: {formatINR(item.security_deposit)} · {item.rental_count} rentals
                        </p>
                        {item.admin_feedback && (
                          <p className="text-xs text-[#9A6B1E] bg-[#FCF7EC] px-2.5 py-1 rounded-lg border border-[#E8D5B5]">
                            Admin Note: {item.admin_feedback}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link href={`/seller/listings/${item.id}/edit`} className="inline-flex items-center gap-1 rounded-xl border border-[#E4DFD7] px-3 py-1.5 text-xs hover:border-[#161616]">
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Link>
                      {item.status === "APPROVED" && (
                        <Button size="sm" variant="subtle" disabled={busyId === item.id} onClick={() => toggleListingStatus(item.id, "PAUSED")}>
                          <Pause className="h-3.5 w-3.5" /> Pause
                        </Button>
                      )}
                      {item.status === "PAUSED" && (
                        <Button size="sm" variant="subtle" disabled={busyId === item.id} onClick={() => toggleListingStatus(item.id, "APPROVED")}>
                          <Play className="h-3.5 w-3.5" /> Resume
                        </Button>
                      )}
                      {["DRAFT", "REJECTED"].includes(item.status) && (
                        <Button size="sm" variant="destructive" disabled={busyId === item.id} onClick={() => deleteListing(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D6CFC5] bg-white p-12 text-center text-sm text-[#8C857B]">
              No listings in this category yet.
            </div>
          )}
        </div>
      )}

      {section === "bookings" && (
        <div className="space-y-4">
          {bookingItems.length > 0 ? (
            bookingItems.map((bi) => (
              <div key={bi.id} className="rounded-2xl border border-[#E4DFD7] bg-white p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono-ref text-xs font-semibold mr-2">{bi.booking?.booking_reference}</span>
                    <Badge>{bi.booking?.status?.replace(/_/g, " ")}</Badge>
                  </div>
                </div>
                <p className="font-semibold text-sm text-[#161616]">{bi.product_title_snapshot}</p>
                <p className="text-xs text-[#57534E]">
                  {formatISTDate(bi.start_date)} – {formatISTDate(bi.end_date)} · Return Deadline: {formatISTDateTime(bi.return_deadline)}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {bi.booking?.status === "CONFIRMED" && (
                    <>
                      <Button size="sm" variant="subtle" disabled={busyId === bi.booking_id} onClick={() => transitionBooking(bi.booking_id, "READY_FOR_PICKUP")}>
                        Ready for Pickup
                      </Button>
                      <Button size="sm" variant="subtle" disabled={busyId === bi.booking_id} onClick={() => transitionBooking(bi.booking_id, "DISPATCHED")}>
                        Dispatched
                      </Button>
                    </>
                  )}
                  {["READY_FOR_PICKUP", "DISPATCHED"].includes(bi.booking?.status || "") && (
                    <Button size="sm" variant="accent" disabled={busyId === bi.booking_id} onClick={() => transitionBooking(bi.booking_id, "RENTAL_ACTIVE")}>
                      Confirm Handover / Active
                    </Button>
                  )}
                  {["RETURN_DUE", "RETURN_INITIATED"].includes(bi.booking?.status || "") && (
                    <Button size="sm" variant="accent" disabled={busyId === bi.booking_id} onClick={() => transitionBooking(bi.booking_id, "RETURNED")}>
                      Confirm Product Received
                    </Button>
                  )}
                  {bi.booking?.status === "RETURNED" && (
                    <Button size="sm" variant="accent" onClick={() => setInspectBookingId(bi.booking_id)}>
                      Record Return Inspection
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D6CFC5] bg-white p-12 text-center text-sm text-[#8C857B]">
              No bookings for your listings yet.
            </div>
          )}

          {inspectBookingId && (
            <form onSubmit={submitInspection} className="rounded-2xl border border-[#161616] bg-white p-6 space-y-4">
              <h3 className="font-editorial text-2xl font-semibold">Record Return Condition Inspection</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select value={conditionStatus} onChange={(e) => setConditionStatus(e.target.value)} className="h-11 rounded-xl border border-[#E4DFD7] px-3 text-sm">
                  <option value="GOOD">Good / Clean Return</option>
                  <option value="MINOR_WEAR">Minor Wear (No Deduction)</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="MISSING_ITEMS">Missing Accessories</option>
                  <option value="LATE">Late Return</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={damageFound} onChange={(e) => setDamageFound(e.target.checked)} className="h-4 w-4" />
                  Damage / Issue Requires Deposit Review
                </label>
              </div>
              {damageFound && (
                <input type="number" min={0} value={deductionRec} onChange={(e) => setDeductionRec(e.target.value)} placeholder="Recommended deduction (₹)" className="h-11 w-full rounded-xl border border-[#E4DFD7] px-3 text-sm" />
              )}
              <textarea value={inspectNotes} onChange={(e) => setInspectNotes(e.target.value)} placeholder="Inspection notes..." className="w-full min-h-[80px] rounded-xl border border-[#E4DFD7] p-3 text-sm" />
              <div className="flex gap-3">
                <Button type="submit" variant="accent" disabled={busyId === inspectBookingId}>Save Inspection</Button>
                <Button type="button" variant="subtle" onClick={() => setInspectBookingId(null)}>Cancel</Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
