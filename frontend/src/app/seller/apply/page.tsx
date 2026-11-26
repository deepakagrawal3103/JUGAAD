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
  const [submitted, setSubmitted] = useState(false);
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
        setError(data.error || "Could not submit seller application.");
        return;
      }
      setSubmitted(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="rounded-2xl border border-[#E8D5B5] bg-[#FCF7EC] p-8 space-y-4 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#9A6B1E] font-semibold">Admin Approval Pending</p>
          <h1 className="font-editorial text-3xl font-semibold text-[#161616]">Aapki Seller Request Submit Ho Gayi Hai!</h1>
          <p className="text-sm text-[#57534E]">
            Admin aapki profile check karke approve karega. <strong>Admin approval ke baad hi aapka Seller account active hoga</strong> aur aap kapde list kar payenge.
          </p>
          <Button variant="accent" onClick={() => router.push("/dashboard")}>
            Dashboard Par Wapas Jao
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="border-b border-[#E4DFD7] pb-6 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#EB5E4C]">Seller Onboarding</p>
        <h1 className="font-editorial text-4xl font-semibold text-[#161616]">Apna Rental Closet Kholo</h1>
        <p className="text-sm text-[#57534E]">
          Apna public closet profile aur private payout details set karo. Aapka pickup address aur contact details kabhi bhi public product pages par nahi dikhenge.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] p-4 text-xs text-[#9E2A2B]">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-[#E4DFD7] bg-white p-6 sm:p-8 space-y-5">
        <Input required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Public Closet / Boutique Naam *" />
        <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Closet Bio (Optional)" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Sheher *" />
          <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" />
          <Input value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} placeholder="Locality" />
        </div>
        <Textarea required value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} placeholder="Private Pickup Address * (sirf confirmed pickup bookings par share hoga)" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#E4DFD7] pt-5">
          <Input required value={form.payout_upi_id} onChange={(e) => setForm({ ...form, payout_upi_id: e.target.value })} placeholder="Payout UPI ID *" />
          <Input required value={form.payout_account_name} onChange={(e) => setForm({ ...form, payout_account_name: e.target.value })} placeholder="Account Holder ka Naam *" />
        </div>
        <Button type="submit" variant="accent" size="lg" disabled={loading} className="w-full">
          {loading ? "Save ho raha hai..." : "Seller Studio Activate Karo & Listing Banao"}
        </Button>
      </form>
    </div>
  );
}
