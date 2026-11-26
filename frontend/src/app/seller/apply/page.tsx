"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";

export default function SellerApplyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    city: "",
    state: "",
    locality: "",
    pickup_address: "",
    payout_upi_id: "",
    payout_account_name: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/seller/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 401) {
        router.push("/login?redirect=/seller/apply");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not activate seller profile.");
        return;
      }
      router.push("/seller/listings/new");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="border-b border-[#E4DFD7] pb-6 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#EB5E4C]">Seller Onboarding</p>
        <h1 className="font-editorial text-4xl font-semibold text-[#161616]">Open Your Rental Closet</h1>
        <p className="text-sm text-[#57534E]">
          Set up your public closet profile and private payout details. Your pickup address and contact details are never exposed on public product pages.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] p-4 text-xs text-[#9E2A2B]">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-[#E4DFD7] bg-white p-6 sm:p-8 space-y-5">
        <Input required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Public Closet / Boutique Name *" />
        <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Closet Bio (Optional)" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City *" />
          <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" />
          <Input value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} placeholder="Locality" />
        </div>
        <Textarea required value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} placeholder="Private Pickup Address * (shared only on confirmed pickup bookings)" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#E4DFD7] pt-5">
          <Input required value={form.payout_upi_id} onChange={(e) => setForm({ ...form, payout_upi_id: e.target.value })} placeholder="Payout UPI ID *" />
          <Input required value={form.payout_account_name} onChange={(e) => setForm({ ...form, payout_account_name: e.target.value })} placeholder="Account Holder Name *" />
        </div>
        <Button type="submit" variant="accent" size="lg" disabled={loading} className="w-full">
          {loading ? "Saving..." : "Activate Seller Studio & Create Listing"}
        </Button>
      </form>
    </div>
  );
}
