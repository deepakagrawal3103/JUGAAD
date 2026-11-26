"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { formatINR } from "@/lib/utils";
import { formatISTDate } from "@/lib/domain/dates";

interface CartItemRow {
  id: string;
  product_id: string;
  start_date: string;
  end_date: string;
  fulfillment_type: string;
  product: {
    id: string;
    title: string;
    slug: string;
    brand: string;
    size: string;
    city: string;
    images?: { public_url: string; is_primary: boolean }[];
  };
  availability: { available: boolean; reason?: string };
  pricing: {
    rentalDays: number;
    effectiveDailyRate: number;
    rentalAmount: number;
    securityDeposit: number;
    deliveryFee: number;
    customerPayable: number;
  };
}

export function CartClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CartItemRow[]>([]);
  const [summary, setSummary] = useState<{
    totalRentalAmount: number;
    totalSecurityDeposit: number;
    totalDeliveryFee: number;
    totalPayable: number;
  } | null>(null);
  const [holdMinutes, setHoldMinutes] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [notes, setNotes] = useState("");

  const loadCart = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setSummary(data.summary ?? null);
        if (data.holdMinutes) setHoldMinutes(data.holdMinutes);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const removeItem = async (id: string) => {
    await apiFetch(`/api/cart/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadCart();
    router.refresh();
  };

  const requiresDeliveryAddress = items.some((i) => i.fulfillment_type !== "PICKUP");
  const hasConflict = items.some((i) => !i.availability?.available);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (hasConflict) {
      setError("Remove unavailable items before proceeding.");
      return;
    }

    setCheckingOut(true);
    try {
      const res = await apiFetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_address:
            fullName || addressLine
              ? {
                  full_name: fullName || "Customer",
                  phone: phone || "0000000000",
                  address_line: addressLine || "Self Pickup",
                  city: city || items[0]?.product.city || "India",
                  pincode: pincode || "000000",
                }
              : null,
          customer_notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Checkout failed. Availability may have changed.");
        await loadCart();
        return;
      }
      router.push(`/checkout/${data.booking_id}`);
      router.refresh();
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) return <div className="py-16 text-sm text-[#8C857B]">Aapka rental bag check ho raha hai...</div>;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D6CFC5] bg-white p-14 text-center space-y-4">
        <p className="font-editorial text-2xl text-[#161616]">Aapka rental bag khaali hai</p>
        <p className="text-sm text-[#57534E] max-w-md mx-auto">
          Verified outfits aur rental dates select karo aur payment se pehle reserve karo.
        </p>
        <Link href="/browse" className="inline-block rounded-xl bg-[#EB5E4C] text-white px-6 py-3 text-xs font-medium uppercase tracking-widest">
          Rentals Dekho
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 space-y-6">
        {error && (
          <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] p-4 text-xs text-[#9E2A2B]">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {items.map((item) => {
            const img =
              item.product.images?.find((i) => i.is_primary)?.public_url ||
              item.product.images?.[0]?.public_url;
            return (
              <div key={item.id} className="rounded-2xl border border-[#E4DFD7] bg-white p-4 sm:p-5 flex gap-4">
                <Link href={`/products/${item.product.slug}`} className="w-24 h-32 rounded-xl shrink-0 bg-[#F3EFEA] border border-[#E4DFD7] overflow-hidden">
                  {img && <img src={img} alt={item.product.title} className="h-full w-full object-cover" />}
                </Link>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#8C857B]">{item.product.brand}</p>
                      <Link href={`/products/${item.product.slug}`} className="font-semibold text-sm text-[#161616] hover:underline">
                        {item.product.title}
                      </Link>
                    </div>
                    <button type="button" onClick={() => removeItem(item.id)} className="text-[#8C857B] hover:text-[#9E2A2B]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[#57534E]">
                    {formatISTDate(item.start_date)} – {formatISTDate(item.end_date)} ({item.pricing.rentalDays} days) · Size {item.product.size} · {item.fulfillment_type.replace(/_/g, " ")}
                  </p>
                  {!item.availability?.available && (
                    <div className="flex items-center gap-1.5 text-xs text-[#9E2A2B]">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{item.availability?.reason || "Dates unavailable"}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs pt-1 tabular-nums">
                    <span>Rent: <strong>{formatINR(item.pricing.rentalAmount)}</strong></span>
                    <span>Deposit: <strong>{formatINR(item.pricing.securityDeposit)}</strong></span>
                    {item.pricing.deliveryFee > 0 && <span>Delivery: <strong>{formatINR(item.pricing.deliveryFee)}</strong></span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-4">
          <h2 className="font-editorial text-2xl font-semibold">
            {requiresDeliveryAddress ? "Delivery & Contact Details" : "Renter Contact Details"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input required={requiresDeliveryAddress} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Poora Naam" />
            <Input required={requiresDeliveryAddress} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile Number (+91)" />
          </div>
          {requiresDeliveryAddress && (
            <div className="space-y-3">
              <Input required value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="Ghar ka Pata / Flat / Landmark" />
              <div className="grid grid-cols-2 gap-4">
                <Input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Sheher" />
                <Input required value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="PIN Code" />
              </div>
            </div>
          )}
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Size ya pickup timing ke baare mein note (optional)..." />
        </div>
      </div>

      <div className="lg:col-span-4 rounded-2xl border border-[#E4DFD7] bg-[#F3EFEA]/70 p-6 space-y-5 sticky top-24">
        <div className="flex items-center justify-between border-b border-[#E4DFD7] pb-3">
          <h2 className="font-semibold text-base">Paisa / Price Breakdown</h2>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#57534E]">100% Clear</span>
        </div>

        {summary && (
          <div className="space-y-3 text-sm tabular-nums">
            <div className="flex justify-between text-[#57534E]">
              <span>Rental Charges</span>
              <span>{formatINR(summary.totalRentalAmount)}</span>
            </div>
            <div className="flex justify-between text-[#57534E]">
              <span>Courier / Delivery</span>
              <span>{formatINR(summary.totalDeliveryFee)}</span>
            </div>
            <div className="flex justify-between text-[#2F5D46]">
              <span>Wapas Milne Waala Deposit</span>
              <span>{formatINR(summary.totalSecurityDeposit)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-[#E4DFD7] pt-3">
              <span>Abhi Total Pay Karna Hai</span>
              <span>{formatINR(summary.totalPayable)}</span>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[#E4DFD7] bg-white p-3.5 text-xs text-[#57534E] space-y-1">
          <p className="font-semibold text-[#161616] flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#2F5D46]" /> {holdMinutes}-Minute Reservation Hold
          </p>
          <p>Jab tak aap UPI payment aur UTR submit karte ho, yeh dates sirf aapke liye lock rahengi.</p>
        </div>

        <div className="rounded-xl border border-[#E8D5B5] bg-[#FCF7EC] p-3.5 text-xs text-[#9A6B1E] space-y-1">
          <p className="font-semibold text-[#161616]">3-Day Policy &amp; Late Fee</p>
          <p>
            1 din pehle pehen sakte hain aur 3rd day return karna hoga. Late hone par har extra day par rent amount ka <strong>30%</strong> late fee lagega.
          </p>
        </div>

        <Button type="submit" variant="accent" size="lg" disabled={checkingOut || hasConflict} className="w-full">
          {checkingOut ? "Dates Lock Ho Rahi Hain..." : "Dates Reserve Karo & UPI se Pay Karo"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
