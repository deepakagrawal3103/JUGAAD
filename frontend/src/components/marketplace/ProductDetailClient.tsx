"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  ZoomIn,
  X,
  Calendar,
  MapPin,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Truck,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api/client";
import { formatINR } from "@/lib/utils";
import { addDaysDateOnly, formatISTDate, getTodayIST } from "@/lib/domain/dates";
import type { FulfillmentType, ProductWithRelations } from "@/types/database";

interface UnavailableInterval {
  start_date: string;
  end_date: string;
  source: string;
}

interface AvailabilityResult {
  available: boolean;
  reason?: string;
  pricing?: {
    rentalDays: number;
    effectiveDailyRate: number;
    rentalAmount: number;
    securityDeposit: number;
    deliveryFee: number;
    customerPayable: number;
  } | null;
}

export function ProductDetailClient({
  product,
  unavailableDates,
  initialWishlisted,
  cleaningBufferDays,
}: {
  product: ProductWithRelations;
  unavailableDates: UnavailableInterval[];
  initialWishlisted: boolean;
  cleaningBufferDays: number;
}) {
  const router = useRouter();
  const images = [...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [wishlisted, setWishlisted] = useState(initialWishlisted);

  const todayIST = getTodayIST();
  const [startDate, setStartDate] = useState(addDaysDateOnly(todayIST, 2));
  const [endDate, setEndDate] = useState(
    addDaysDateOnly(todayIST, 2 + Math.max(1, product.min_rental_days) - 1)
  );
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>(
    product.fulfillment_options?.pickup ? "PICKUP" : "SELLER_DELIVERY"
  );
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartFeedback, setCartFeedback] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => {
    const [y, m] = todayIST.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  const [calPickMode, setCalPickMode] = useState<"start" | "end">("start");
  const [calMsg, setCalMsg] = useState<string | null>(null);

  const isDateBlocked = (iso: string) =>
    unavailableDates.some((u) => iso >= u.start_date && iso <= u.end_date);

  const handleCalendarDayClick = (iso: string) => {
    setCalMsg(null);
    if (iso < todayIST || isDateBlocked(iso)) return;
    if (calPickMode === "start") {
      setStartDate(iso);
      const nextEnd = addDaysDateOnly(iso, Math.max(1, product.min_rental_days) - 1);
      setEndDate(nextEnd);
      setCalPickMode("end");
    } else {
      if (iso < startDate) {
        setStartDate(iso);
        setEndDate(addDaysDateOnly(iso, Math.max(1, product.min_rental_days) - 1));
        return;
      }
      // Check if any date between startDate and iso is blocked
      const hasBlockedBetween = unavailableDates.some(
        (u) => !(u.end_date < startDate || u.start_date > iso)
      );
      if (hasBlockedBetween) {
        setCalMsg("Some dates in this range are already rented — please select other available dates.");
        return;
      }
      setEndDate(iso);
      setCalPickMode("start");
    }
  };

  const applyPresetDays = (days: number) => {
    const baseStart = startDate || addDaysDateOnly(todayIST, 2);
    const clamped = Math.min(product.max_rental_days, Math.max(product.min_rental_days, days));
    setStartDate(baseStart);
    setEndDate(addDaysDateOnly(baseStart, clamped - 1));
  };

  useEffect(() => {
    if (!startDate || !endDate) return;
    let active = true;
    const run = async () => {
      setChecking(true);
      try {
        const params = new URLSearchParams({
          product_id: product.id,
          start_date: startDate,
          end_date: endDate,
          fulfillment_type: fulfillmentType,
        });
        const res = await apiFetch(`/api/catalog/availability?${params.toString()}`);
        const data = await res.json();
        if (active) setAvailability(data);
      } catch {
        if (active) setAvailability({ available: false, reason: "Could not verify availability." });
      } finally {
        if (active) setChecking(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [product.id, startDate, endDate, fulfillmentType]);

  const handleToggleWishlist = async () => {
    const res = await apiFetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: product.id }),
    });
    if (res.status === 401) {
      router.push(`/login?redirect=/products/${product.slug}`);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setWishlisted(Boolean(data.wishlisted));
    }
  };

  const handleAddToCart = async () => {
    setCartFeedback(null);
    setAddingToCart(true);
    try {
      const res = await apiFetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          start_date: startDate,
          end_date: endDate,
          fulfillment_type: fulfillmentType,
        }),
      });
      if (res.status === 401) {
        router.push(`/login?redirect=/products/${product.slug}`);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setCartFeedback(data.error || "Could not add item to bag.");
        return;
      }
      router.push("/cart");
      router.refresh();
    } finally {
      setAddingToCart(false);
    }
  };

  const activeImg = images[selectedIdx]?.public_url;
  const sellerInitials = product.seller?.display_name
    ? product.seller.display_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "CL";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start pb-24 lg:pb-0">
      {/* Left: 3:4 Image Gallery */}
      <div className="lg:col-span-6 space-y-3">
        <div className="relative aspect-[3/4] w-full rounded-2xl border border-[#E4DFD7] bg-[#F3EFEA] overflow-hidden">
          {activeImg ? (
            <img src={activeImg} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-sm text-[#8C857B]">
              No image uploaded
            </div>
          )}

          <div className="absolute top-3.5 left-3.5">
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3" /> RentKro Inspected
            </Badge>
          </div>

          <button
            type="button"
            onClick={handleToggleWishlist}
            className="absolute bottom-3.5 right-3.5 h-10 w-10 rounded-full bg-white/95 flex items-center justify-center text-[#161616] shadow-xs"
            aria-label="Toggle wishlist"
          >
            <Heart className={`h-4 w-4 ${wishlisted ? "fill-[#EB5E4C] text-[#EB5E4C]" : ""}`} />
          </button>

          {activeImg && (
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              className="absolute bottom-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-medium text-[#161616] shadow-xs"
            >
              <ZoomIn className="h-3.5 w-3.5" /> Zoom
            </button>
          )}
        </div>

        {images.length > 1 && (
          <div className="grid grid-cols-5 gap-2.5">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelectedIdx(i)}
                className={`aspect-[3/4] rounded-xl border overflow-hidden ${
                  selectedIdx === i ? "border-[#161616] ring-1 ring-[#161616]" : "border-[#E4DFD7]"
                }`}
              >
                <img src={img.public_url} alt={img.angle_tag || product.title} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Stitch Item Detail Flow */}
      <div className="lg:col-span-6 space-y-5">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#EB5E4C]">
            {product.brand}
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#161616]">
            {product.title}
          </h1>
          <p className="text-xs text-[#57534E] flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#EB5E4C]" />
            {product.locality ? `${product.locality}, ` : ""}
            {product.city} · Size {product.size} · {product.color}
          </p>
        </div>

        {/* Verified Lender Card (Strictly no private phone/email) */}
        {product.seller && (
          <div className="rounded-2xl border border-[#E4DFD7] bg-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#F3EFEA] flex items-center justify-center text-xs font-semibold text-[#161616]">
                {sellerInitials}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#161616] flex items-center gap-1">
                  {product.seller.display_name}
                  <ShieldCheck className="h-3.5 w-3.5 text-[#2F5D46]" />
                </p>
                <p className="text-xs text-[#57534E]">
                  Verified Lender · {product.seller.total_rentals} completed rentals
                </p>
              </div>
            </div>
            <Badge variant="success">Verified</Badge>
          </div>
        )}

        {/* Transparent Rental + Deposit Card */}
        <div className="rounded-2xl border border-[#E4DFD7] bg-[#F3EFEA]/70 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold text-[#161616] tabular-nums">
              {formatINR(product.daily_price)}{" "}
              <span className="text-sm font-normal text-[#57534E]">/ day</span>
            </p>
            <p className="text-xs text-[#57534E] tabular-nums">
              +{formatINR(product.security_deposit)} refundable security deposit
            </p>
          </div>
          <Badge variant="success">
            <ShieldCheck className="h-3 w-3" /> Damage Protected
          </Badge>
        </div>

        {/* Select Event Duration Presets + Custom Dates */}
        <div className="rounded-2xl border border-[#E4DFD7] bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#161616] flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[#EB5E4C]" /> Select Event Duration
            </span>
            <span className="text-[11px] font-medium text-[#EB5E4C]">
              {product.min_rental_days}–{product.max_rental_days} days allowed
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { days: 3, label: "3-Day", sub: "Weekend" },
              { days: 5, label: "5-Day", sub: "Wedding" },
              { days: 7, label: "7-Day", sub: "Full Week" },
            ].map((preset) => {
              const isSelected = availability?.pricing?.rentalDays === preset.days;
              return (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => applyPresetDays(preset.days)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-[#EB5E4C] bg-[#FDECE9]"
                      : "border-[#E4DFD7] bg-[#FAF8F5] hover:border-[#161616]"
                  }`}
                >
                  <p className="text-xs font-semibold text-[#161616]">{preset.label}</p>
                  <p className="text-[11px] text-[#57534E]">{preset.sub}</p>
                  <p className="text-xs font-bold text-[#161616] mt-1 tabular-nums">
                    {formatINR(product.daily_price * preset.days)}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[#57534E]">Start Date (IST)</label>
              <Input type="date" min={todayIST} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[#57534E]">Return Date (IST)</label>
              <Input type="date" min={startDate || todayIST} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Interactive Availability Calendar */}
          {(() => {
            const year = calMonth.getFullYear();
            const month = calMonth.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const monthLabel = calMonth.toLocaleString("en-IN", { month: "long", year: "numeric" });
            const cells: (string | null)[] = Array(firstDay).fill(null);
            for (let d = 1; d <= daysInMonth; d++) {
              const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              cells.push(iso);
            }
            return (
              <div className="rounded-xl border border-[#E4DFD7] bg-[#FAF8F5] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#161616]">
                    Availability Calendar ({calPickMode === "start" ? "Select Start Date" : "Select Return Date"})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCalMonth(new Date(year, month - 1, 1))}
                      className="p-1 rounded-lg border border-[#E4DFD7] bg-white hover:border-[#161616]"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs font-medium px-2 min-w-[110px] text-center">{monthLabel}</span>
                    <button
                      type="button"
                      onClick={() => setCalMonth(new Date(year, month + 1, 1))}
                      className="p-1 rounded-lg border border-[#E4DFD7] bg-white hover:border-[#161616]"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#8C857B]">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w) => (
                    <div key={w} className="py-1">{w}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {cells.map((iso, idx) => {
                    if (!iso) return <div key={`empty-${idx}`} />;
                    const past = iso < todayIST;
                    const blocked = isDateBlocked(iso);
                    const isSelected = startDate && endDate && iso >= startDate && iso <= endDate;
                    const dayNum = Number(iso.split("-")[2]);

                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={past || blocked}
                        onClick={() => handleCalendarDayClick(iso)}
                        title={blocked ? "Already Rented / Booked" : past ? "Past date" : "Available — click to select"}
                        className={`h-8 rounded-lg text-xs font-medium transition-colors tabular-nums ${
                          blocked
                            ? "bg-[#FDF1F1] text-[#9E2A2B] line-through cursor-not-allowed border border-[#E6C5C5]"
                            : past
                            ? "text-[#C5BEB3] cursor-not-allowed"
                            : isSelected
                            ? "bg-[#EB5E4C] text-white font-semibold"
                            : "bg-white text-[#161616] border border-[#E4DFD7] hover:border-[#2F5D46] hover:bg-[#EDF5F0]"
                        }`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#57534E] pt-1">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-white border border-[#E4DFD7] inline-block" /> Available</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FDF1F1] border border-[#E6C5C5] inline-block" /> Rented / Booked</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#EB5E4C] inline-block" /> Selected</span>
                </div>

                {calMsg && <p className="text-[11px] text-[#9E2A2B] font-medium">{calMsg}</p>}
              </div>
            );
          })()}

          {/* Delivery & Pickup Options */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-[#161616]">Delivery &amp; Pickup</p>
            {product.fulfillment_options?.pickup && (
              <button
                type="button"
                onClick={() => setFulfillmentType("PICKUP")}
                className={`w-full rounded-xl border p-3 flex items-center justify-between text-left ${
                  fulfillmentType === "PICKUP"
                    ? "border-[#EB5E4C] bg-[#FDECE9]/50"
                    : "border-[#E4DFD7] bg-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Store className="h-4 w-4 text-[#EB5E4C]" />
                  <div>
                    <p className="text-xs font-semibold text-[#161616]">Self-pickup</p>
                    <p className="text-[11px] text-[#8C857B]">Exact address shared after booking confirmation</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#2F5D46]">Free</span>
              </button>
            )}
            {product.fulfillment_options?.seller_delivery && (
              <button
                type="button"
                onClick={() => setFulfillmentType("SELLER_DELIVERY")}
                className={`w-full rounded-xl border p-3 flex items-center justify-between text-left ${
                  fulfillmentType === "SELLER_DELIVERY"
                    ? "border-[#EB5E4C] bg-[#FDECE9]/50"
                    : "border-[#E4DFD7] bg-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Truck className="h-4 w-4 text-[#EB5E4C]" />
                  <div>
                    <p className="text-xs font-semibold text-[#161616]">Seller Delivery</p>
                    <p className="text-[11px] text-[#8C857B]">Doorstep handover</p>
                  </div>
                </div>
                <span className="text-xs font-semibold tabular-nums">
                  +{formatINR(product.fulfillment_options.delivery_fee || 0)}
                </span>
              </button>
            )}
          </div>

          {checking ? (
            <p className="text-xs text-[#8C857B]">Checking live availability...</p>
          ) : availability?.available && availability.pricing ? (
            <div className="rounded-xl border border-[#C4DACB] bg-[#EDF5F0] p-3.5 text-xs space-y-1.5 tabular-nums">
              <div className="flex justify-between font-semibold text-[#2F5D46]">
                <span>Available ({availability.pricing.rentalDays} days)</span>
                <span>Rent: {formatINR(availability.pricing.rentalAmount)}</span>
              </div>
              <div className="flex justify-between text-[#161616]">
                <span>Security Deposit (100% Refundable)</span>
                <span>{formatINR(availability.pricing.securityDeposit)}</span>
              </div>
              {availability.pricing.deliveryFee > 0 && (
                <div className="flex justify-between text-[#161616]">
                  <span>Delivery Fee</span>
                  <span>{formatINR(availability.pricing.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[#161616] border-t border-[#C4DACB] pt-1.5">
                <span>Total Payable Now</span>
                <span>{formatINR(availability.pricing.customerPayable)}</span>
              </div>
              <div className="flex justify-between font-semibold text-[#2F5D46]">
                <span>Refundable Upon Return</span>
                <span>{formatINR(availability.pricing.securityDeposit)}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] p-3 text-xs text-[#9E2A2B] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{availability?.reason || "Selected dates are unavailable."}</span>
            </div>
          )}

          {unavailableDates.length > 0 && (
            <div className="pt-1">
              <p className="text-[11px] text-[#8C857B] mb-1">
                Blocked Dates ({cleaningBufferDays}-day cleaning buffer included):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unavailableDates.slice(0, 6).map((u, idx) => (
                  <span key={idx} className="rounded-full bg-[#F3EFEA] px-2.5 py-0.5 text-[11px] text-[#57534E]">
                    {formatISTDate(u.start_date)} – {formatISTDate(u.end_date)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {cartFeedback && <p className="text-xs text-[#9E2A2B]">{cartFeedback}</p>}

          <Button
            variant="accent"
            size="lg"
            onClick={handleAddToCart}
            disabled={!availability?.available || addingToCart || checking}
            className="w-full"
          >
            {addingToCart ? "Adding to Bag..." : "Reserve Dates"}
          </Button>
        </div>

        {/* Garment Specs & Policy */}
        <div className="rounded-2xl border border-[#E4DFD7] bg-white p-5 space-y-3 text-sm text-[#57534E]">
          <h2 className="font-semibold text-[#161616]">Garment Specifications &amp; Care</h2>
          <p className="text-xs leading-relaxed whitespace-pre-line">{product.description}</p>
          <div className="grid grid-cols-3 gap-2 pt-2 text-center">
            <div className="rounded-xl bg-[#FAF8F5] p-2.5">
              <span className="block text-[10px] uppercase text-[#8C857B]">Size</span>
              <span className="text-xs font-semibold text-[#161616]">{product.size}</span>
            </div>
            <div className="rounded-xl bg-[#FAF8F5] p-2.5">
              <span className="block text-[10px] uppercase text-[#8C857B]">Occasion</span>
              <span className="text-xs font-semibold text-[#161616] truncate block">{product.occasion}</span>
            </div>
            <div className="rounded-xl bg-[#FAF8F5] p-2.5">
              <span className="block text-[10px] uppercase text-[#8C857B]">Late Fee</span>
              <span className="text-xs font-semibold text-[#161616]">{formatINR(product.late_fee_per_day)}/d</span>
            </div>
          </div>
          <div className="rounded-xl border border-[#E8D5B5] bg-[#FCF7EC] p-3.5 text-xs text-[#9A6B1E] space-y-1">
            <p className="font-semibold text-[#161616]">3-Day Rental &amp; Late Return Policy</p>
            <p>
              • You can collect and wear the outfit <strong>1 day before your event</strong> and must return it by <strong>9:00 PM IST on the 3rd day</strong>.
            </p>
            <p>
              • Returns after the 3rd day incur a <strong>30% late fee of the rental amount per extra day</strong> (approx. {formatINR(Math.round((availability?.pricing?.rentalAmount ?? product.daily_price * 3) * 0.3))}/extra day).{" "}
              <a href="/policies/cancellation-policy" className="underline text-[#161616]">
                View Policies
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar (Stitch Screen 4) */}
      <div className="lg:hidden fixed bottom-14 inset-x-0 z-30 border-t border-[#E4DFD7] bg-white px-4 py-3 flex items-center justify-between gap-3">
        <div className="tabular-nums">
          <p className="text-sm font-bold text-[#161616]">
            {formatINR(availability?.pricing?.rentalAmount ?? product.daily_price)}{" "}
            <span className="text-xs font-normal text-[#57534E]">rental</span>
          </p>
          <p className="text-[11px] text-[#8C857B]">
            +{formatINR(product.security_deposit)} refundable deposit
          </p>
        </div>
        <Button
          variant="accent"
          onClick={handleAddToCart}
          disabled={!availability?.available || addingToCart || checking}
        >
          Reserve Dates
        </Button>
      </div>

      {zoomOpen && activeImg && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="absolute top-6 right-6 h-10 w-10 rounded-full bg-white text-[#161616] flex items-center justify-center"
            aria-label="Close zoom"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={activeImg}
            alt={product.title}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
