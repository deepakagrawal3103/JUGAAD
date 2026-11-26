"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api/client";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatINR } from "@/lib/utils";
import { formatISTDate, formatISTDateTime, getCountdownParts } from "@/lib/domain/dates";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/types/database";

interface CustomerBookingRow {
  id: string;
  booking_reference: string;
  status: BookingStatus;
  payment_status: string;
  total_rental_amount: number;
  total_security_deposit: number;
  total_payable: number;
  created_at: string;
  items: {
    id: string;
    product_title_snapshot: string;
    product_image_snapshot: string | null;
    start_date: string;
    end_date: string;
    return_deadline: string;
  }[];
  security_deposit?: {
    status: string;
    amount_held: number;
    refund_amount: number;
    deduction_amount: number;
  } | null;
}

interface UserProfileData {
  full_name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  address_line: string | null;
  pincode: string | null;
  preferred_size: string | null;
}

const TABS = [
  { key: "all", label: "Sabhi Bookings" },
  { key: "payment_pending", label: "Payment Baaki" },
  { key: "verification", label: "Verification" },
  { key: "upcoming", label: "Upcoming / Confirm" },
  { key: "active", label: "Abhi Rent Par" },
  { key: "returns", label: "Return & Deposit" },
  { key: "completed", label: "Complete" },
  { key: "cancelled", label: "Cancel" },
  { key: "profile", label: "Profile Settings" },
];

export function CustomerDashboardClient({
  bookings,
  profile,
  email,
}: {
  bookings: CustomerBookingRow[];
  profile: UserProfileData;
  email: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [profileForm, setProfileForm] = useState({
    full_name: profile.full_name || "",
    phone: profile.phone || "",
    city: profile.city || "",
    state: profile.state || "",
    address_line: profile.address_line || "",
    pincode: profile.pincode || "",
    preferred_size: profile.preferred_size || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const filtered = bookings.filter((b) => {
    if (tab === "all") return true;
    if (tab === "payment_pending") return b.status === "AWAITING_PAYMENT";
    if (tab === "verification") return b.status === "PAYMENT_VERIFICATION_PENDING";
    if (tab === "upcoming") return ["CONFIRMED", "READY_FOR_PICKUP", "DISPATCHED"].includes(b.status);
    if (tab === "active") return b.status === "RENTAL_ACTIVE";
    if (tab === "returns")
      return ["RETURN_DUE", "RETURN_INITIATED", "RETURNED", "INSPECTION_PENDING", "DEPOSIT_REFUND_PENDING"].includes(b.status);
    if (tab === "completed") return b.status === "COMPLETED";
    if (tab === "cancelled") return b.status === "CANCELLED";
    return true;
  });

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await apiFetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      setProfileMsg(res.ok ? "Profile update ho gaya." : "Profile update nahi ho paya.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/demo-session", { method: "DELETE" }).catch(() => {});
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E4DFD7] bg-white p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8C857B]">Kul Bookings</p>
          <p className="font-editorial text-3xl font-semibold mt-1">{bookings.length}</p>
        </div>
        <div className="rounded-2xl border border-[#E4DFD7] bg-white p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8C857B]">Active / Aane Waali</p>
          <p className="font-editorial text-3xl font-semibold mt-1">
            {bookings.filter((b) => ["CONFIRMED", "READY_FOR_PICKUP", "DISPATCHED", "RENTAL_ACTIVE"].includes(b.status)).length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E4DFD7] bg-white p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8C857B]">Deposit Jama</p>
          <p className="font-editorial text-3xl font-semibold mt-1 tabular-nums">
            {formatINR(bookings.reduce((sum, b) => sum + Number(b.security_deposit?.amount_held || 0), 0))}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E4DFD7] bg-white p-5 flex flex-col justify-between">
          <p className="text-[11px] uppercase tracking-wider text-[#8C857B]">Account</p>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9E2A2B] hover:underline"
          >
            <LogOut className="h-3.5 w-3.5" /> Log Out
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#E4DFD7] pb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium border transition-colors ${
              tab === t.key
                ? "border-[#EB5E4C] bg-[#FDECE9] text-[#D94E3D]"
                : "border-[#E4DFD7] bg-white text-[#57534E]"
            }`}
          >
            {t.label}
          </button>
        ))}
        <Link href="/wishlist" className="rounded-full px-4 py-1.5 text-xs font-medium border border-[#E4DFD7] bg-[#F3EFEA] text-[#161616]">
          Meri Wishlist →
        </Link>
      </div>

      {tab === "profile" ? (
        <form onSubmit={saveProfile} className="rounded-2xl border border-[#E4DFD7] bg-white p-6 max-w-2xl space-y-4">
          <h2 className="font-editorial text-2xl font-semibold">Profile Settings</h2>
          <p className="text-xs text-[#8C857B]">{email} se login hai</p>
          {profileMsg && (
            <div className="rounded-xl border border-[#C4DACB] bg-[#EDF5F0] p-3 text-xs text-[#2F5D46]">
              {profileMsg}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input required value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} placeholder="Full Name" />
            <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="Phone" />
            <Input value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} placeholder="City" />
            <Input value={profileForm.preferred_size} onChange={(e) => setProfileForm({ ...profileForm, preferred_size: e.target.value })} placeholder="Preferred Size" />
          </div>
          <Input value={profileForm.address_line} onChange={(e) => setProfileForm({ ...profileForm, address_line: e.target.value })} placeholder="Delivery Address" />
          <Button type="submit" variant="accent" disabled={savingProfile}>
            {savingProfile ? "Save ho raha hai..." : "Profile Save Karo"}
          </Button>
        </form>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((booking) => {
            const firstItem = booking.items[0];
            const countdown =
              firstItem?.return_deadline && ["RENTAL_ACTIVE", "RETURN_DUE"].includes(booking.status)
                ? getCountdownParts(firstItem.return_deadline)
                : null;

            return (
              <div
                key={booking.id}
                className="rounded-2xl border border-[#E4DFD7] bg-white p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
              >
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-20 rounded-xl border border-[#E4DFD7] bg-[#F3EFEA] shrink-0 overflow-hidden">
                    {firstItem?.product_image_snapshot && (
                      <img src={firstItem.product_image_snapshot} alt={firstItem.product_title_snapshot} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-ref text-xs font-semibold text-[#161616]">{booking.booking_reference}</span>
                      <Badge
                        variant={
                          booking.status === "CONFIRMED" || booking.status === "COMPLETED"
                            ? "success"
                            : booking.status === "CANCELLED" || booking.status === "DISPUTED"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {BOOKING_STATUS_LABELS[booking.status] || booking.status}
                      </Badge>
                      <Badge>{booking.payment_status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="font-semibold text-sm text-[#161616]">
                      {firstItem?.product_title_snapshot}
                      {booking.items.length > 1 ? ` + ${booking.items.length - 1} aur` : ""}
                    </p>
                    {firstItem && (
                      <p className="text-xs text-[#57534E]">
                        {formatISTDate(firstItem.start_date)} – {formatISTDate(firstItem.end_date)} · Wapsi tak:{" "}
                        {formatISTDateTime(firstItem.return_deadline)}
                      </p>
                    )}
                    {countdown && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-[#EB5E4C] font-medium flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> Wapsi ka Time: {countdown.label}
                        </p>
                        <p className="text-[11px] text-[#9A6B1E]">
                          3rd day time par return karein, warna har extra day par rent ka 30% ({formatINR(Math.round(booking.total_rental_amount * 0.3))}/day) late fee lagega.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                  <div className="text-xs text-[#57534E] sm:text-right tabular-nums">
                    <span>Rent: <strong>{formatINR(booking.total_rental_amount)}</strong></span> ·{" "}
                    <span>Deposit: <strong>{formatINR(booking.total_security_deposit)}</strong></span>
                    <span className="block text-[11px] font-medium text-[#2F5D46]">
                      Wapas Refund Hoga: <strong>{formatINR(booking.security_deposit?.refund_amount || booking.total_security_deposit)}</strong>
                      {booking.security_deposit ? ` (${booking.security_deposit.status.replace(/_/g, " ")})` : ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {booking.status === "AWAITING_PAYMENT" && (
                      <Link href={`/checkout/${booking.id}`} className="rounded-xl bg-[#EB5E4C] text-white px-4 py-2 text-xs font-medium">
                        Abhi Pay Karo
                      </Link>
                    )}
                    <Link href={`/dashboard/bookings/${booking.id}`} className="rounded-xl border border-[#161616] px-4 py-2 text-xs font-medium hover:bg-[#161616] hover:text-white transition-colors">
                      Details Dekho
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#D6CFC5] bg-white p-12 text-center space-y-3">
          <p className="font-editorial text-2xl text-[#161616]">Is view mein koi booking nahi hai</p>
          <Link href="/browse" className="inline-block rounded-xl border border-[#161616] px-5 py-2 text-xs font-medium">
            Rentals Explore Karo
          </Link>
        </div>
      )}
    </div>
  );
}
