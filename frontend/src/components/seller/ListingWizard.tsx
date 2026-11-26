"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, CheckCircle2, AlertTriangle, Plus, Sparkles, ShieldCheck } from "lucide-react";
import { GENDER_STYLES, OCCASIONS, PRODUCT_CONDITIONS, SIZES } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api/client";
import { formatINR } from "@/lib/utils";
import type { CategoryRecord, ProductCondition } from "@/types/database";

const STEPS = [
  "Basic Info",
  "Outfit Specs",
  "Upload Photos",
  "Smart Pricing",
  "Availability",
  "Handover",
  "Review & Submit",
];

const ANGLE_TAGS = ["Front View", "Back View", "Detail View", "Brand Label", "Defect / Wear"];

interface UploadedImage {
  storage_path: string;
  public_url: string;
  angle_tag: string;
  sort_order: number;
  is_primary: boolean;
}

interface BlockedRange {
  start_date: string;
  end_date: string;
  reason: string;
}

export function ListingWizard({
  categories,
  commissionPercent,
  initialListing,
}: {
  categories: CategoryRecord[];
  commissionPercent: number;
  initialListing?: {
    id: string;
    title: string;
    category_id: string;
    subcategory: string | null;
    brand: string;
    description: string;
    size: string;
    color: string;
    gender_style: string;
    occasion: string;
    condition: ProductCondition;
    fabric: string | null;
    original_retail_price: number | null;
    daily_price: number;
    security_deposit: number;
    min_rental_days: number;
    max_rental_days: number;
    late_fee_per_day: number;
    quantity: number;
    city: string;
    locality: string | null;
    fulfillment_options: { pickup: boolean; seller_delivery: boolean; platform_delivery: boolean; delivery_fee: number };
    images?: UploadedImage[];
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState(initialListing?.title || "");
  const [categoryId, setCategoryId] = useState(initialListing?.category_id || categories[0]?.id || "");
  const [subcategory, setSubcategory] = useState(initialListing?.subcategory || "");
  const [brand, setBrand] = useState(initialListing?.brand || "");
  const [description, setDescription] = useState(initialListing?.description || "");

  const [size, setSize] = useState(initialListing?.size || "M");
  const [color, setColor] = useState(initialListing?.color || "");
  const [genderStyle, setGenderStyle] = useState(initialListing?.gender_style || "Women");
  const [occasion, setOccasion] = useState(initialListing?.occasion || OCCASIONS[0]);
  const [condition, setCondition] = useState<ProductCondition>(initialListing?.condition || "LIKE_NEW");
  const [fabric, setFabric] = useState(initialListing?.fabric || "");
  const [originalPrice, setOriginalPrice] = useState(
    initialListing?.original_retail_price ? String(initialListing.original_retail_price) : "18000"
  );

  const [images, setImages] = useState<UploadedImage[]>(initialListing?.images ?? []);
  const [selectedAngle, setSelectedAngle] = useState(ANGLE_TAGS[0]);

  const [dailyPrice, setDailyPrice] = useState(
    initialListing?.daily_price ? String(initialListing.daily_price) : "900"
  );
  const [securityDeposit, setSecurityDeposit] = useState(
    initialListing?.security_deposit !== undefined ? String(initialListing.security_deposit) : "2000"
  );
  const [minDays, setMinDays] = useState(String(initialListing?.min_rental_days ?? 1));
  const [maxDays, setMaxDays] = useState(String(initialListing?.max_rental_days ?? 10));
  const [lateFee, setLateFee] = useState(String(initialListing?.late_fee_per_day ?? 250));
  const [quantity, setQuantity] = useState(String(initialListing?.quantity ?? 1));

  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [currentlyInUse, setCurrentlyInUse] = useState(false);
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);
  const [newBlockStart, setNewBlockStart] = useState("");
  const [newBlockEnd, setNewBlockEnd] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");

  const [pickup, setPickup] = useState(initialListing?.fulfillment_options?.pickup ?? true);
  const [sellerDelivery, setSellerDelivery] = useState(initialListing?.fulfillment_options?.seller_delivery ?? false);
  const [deliveryFee, setDeliveryFee] = useState(String(initialListing?.fulfillment_options?.delivery_fee ?? 0));
  const [city, setCity] = useState(initialListing?.city || "");
  const [locality, setLocality] = useState(initialListing?.locality || "");

  const retailNum = Number(originalPrice || 0);
  const suggestedDaily = retailNum > 0 ? Math.max(250, Math.round((retailNum * 0.05) / 50) * 50) : 900;
  const suggestedDeposit = retailNum > 0 ? Math.max(500, Math.round((retailNum * 0.11) / 100) * 100) : 2000;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          setError(`${file.name}: Only JPEG, PNG, or WebP allowed.`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          setError(`${file.name}: Exceeds 5 MB limit.`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        const res = await apiFetch("/api/seller/upload-image", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Upload failed.");
          continue;
        }
        setImages((prev) => [
          ...prev,
          {
            storage_path: data.storage_path,
            public_url: data.public_url,
            angle_tag: selectedAngle,
            sort_order: prev.length,
            is_primary: prev.length === 0,
          },
        ]);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async (submitForReview: boolean) => {
    setError(null);
    if (!pickup && !sellerDelivery) {
      setError("Select at least one handover option.");
      return;
    }
    if (submitForReview && images.length < 1) {
      setError("Upload at least 1 photo before submitting for admin approval.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title,
        category_id: categoryId,
        subcategory: subcategory || null,
        brand,
        description,
        size,
        color,
        gender_style: genderStyle,
        occasion,
        condition,
        fabric: fabric || null,
        original_retail_price: originalPrice ? Number(originalPrice) : null,
        daily_price: Number(dailyPrice),
        security_deposit: Number(securityDeposit),
        min_rental_days: Number(minDays),
        max_rental_days: Number(maxDays),
        duration_pricing: [],
        late_fee_per_day: Number(lateFee || 0),
        quantity: Number(quantity || 1),
        fulfillment_options: {
          pickup,
          seller_delivery: sellerDelivery,
          platform_delivery: false,
          delivery_fee: sellerDelivery ? Number(deliveryFee || 0) : 0,
        },
        city,
        locality: locality || null,
        available_from: availableFrom || null,
        available_until: availableUntil || null,
        currently_in_use: currentlyInUse,
        blocked_ranges: blockedRanges,
        images,
        submit_for_review: submitForReview,
      };
      const path = initialListing ? `/api/seller/listings/${initialListing.id}` : "/api/seller/listings";
      const method = initialListing ? "PATCH" : "POST";
      const res = await apiFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save listing.");
        return;
      }
      router.push("/seller");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const numericDaily = Number(dailyPrice || 0);
  const estNet = numericDaily - Math.round(numericDaily * (commissionPercent / 100));

  return (
    <div className="space-y-6">
      {/* Stitch Lender Hero Banner */}
      <div className="rounded-2xl border border-[#E4DFD7] bg-[#F3EFEA] p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#57534E]">
            Lender Studio
          </span>
          <Badge variant="coral">Admin Reviewed</Badge>
        </div>
        <h2 className="font-editorial text-3xl font-semibold text-[#161616]">
          Turn your occasion wear into monthly income
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success"><ShieldCheck className="h-3 w-3" /> Protected by refundable deposit</Badge>
          <Badge>Verified renters only</Badge>
        </div>
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
        {STEPS.map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(idx)}
            className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
              step === idx
                ? "border-[#EB5E4C] bg-[#FDECE9] text-[#D94E3D] font-semibold"
                : idx < step
                ? "border-[#C4DACB] bg-[#EDF5F0] text-[#2F5D46]"
                : "border-[#E4DFD7] bg-white text-[#57534E]"
            }`}
          >
            <span className="block text-[10px] opacity-75">Step {idx + 1}</span>
            <span className="truncate block">{label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] p-4 text-xs text-[#9E2A2B]">{error}</div>
      )}

      <div className="rounded-2xl border border-[#E4DFD7] bg-white p-6 sm:p-8 space-y-6">
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="font-editorial text-2xl font-semibold">1. Basic Information</h3>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Item Name (e.g. Pastel Pink Organza Saree)" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="Subcategory (optional)" />
            </div>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand / Designer" />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe fit, measurements, included pieces, and care..." />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-editorial text-2xl font-semibold">2. Outfit Specifications</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#57534E]">Size *</label>
              <div className="flex flex-wrap gap-2">
                {SIZES.slice(0, 7).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium border ${
                      size === s ? "border-[#EB5E4C] bg-[#FDECE9] text-[#D94E3D]" : "border-[#E4DFD7] bg-white text-[#161616]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color (e.g. Sage Green)" />
              <Select value={genderStyle} onChange={(e) => setGenderStyle(e.target.value)}>
                {GENDER_STYLES.map((g) => <option key={g} value={g}>{g}</option>)}
              </Select>
              <Select value={condition} onChange={(e) => setCondition(e.target.value as ProductCondition)}>
                {PRODUCT_CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
                {OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
              <Input value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="Fabric (e.g. Raw Silk)" />
              <Input type="number" min={0} value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="Original Retail Price (₹)" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-editorial text-2xl font-semibold">3. Upload Photos</h3>
                <p className="text-xs text-[#57534E]">3:4 portrait · Natural light, full-length photos rent 3× faster</p>
              </div>
              <span className="text-xs text-[#57534E]">{images.length} uploaded</span>
            </div>

            {images.length < 3 && (
              <div className="rounded-xl border border-[#E8D5B5] bg-[#FCF7EC] p-3 text-xs text-[#9A6B1E] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Minimum 3 photos recommended (Front, Back, Detail, Brand Label).</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedAngle} onChange={(e) => setSelectedAngle(e.target.value)} className="w-48">
                {ANGLE_TAGS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </Select>
              <label className="inline-flex items-center gap-2 rounded-xl bg-[#EB5E4C] text-white px-5 py-2.5 text-xs font-medium cursor-pointer hover:bg-[#D94E3D]">
                <Camera className="h-4 w-4" />
                {uploading ? "Uploading..." : "Tap to Add Photos"}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={handleImageUpload} className="hidden" />
              </label>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {images.map((img, i) => (
                  <div key={img.storage_path} className="rounded-xl border border-[#E4DFD7] p-2 space-y-2">
                    <div className="aspect-[3/4] rounded-lg bg-[#F3EFEA] overflow-hidden">
                      <img src={img.public_url} alt={img.angle_tag} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="truncate text-[#57534E]">{i === 0 ? "Cover · " : ""}{img.angle_tag}</span>
                      <button type="button" onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))} className="text-[#9E2A2B]">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h3 className="font-editorial text-2xl font-semibold">4. Smart Pricing Calculator</h3>
            <div className="rounded-2xl border border-[#E4DFD7] bg-[#F3EFEA] p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#57534E]">
                  Suggested from {formatINR(retailNum)} Retail
                </p>
                <p className="text-sm font-bold text-[#161616] tabular-nums">
                  {formatINR(suggestedDaily)} / day · Deposit {formatINR(suggestedDeposit)}
                </p>
              </div>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => {
                  setDailyPrice(String(suggestedDaily));
                  setSecurityDeposit(String(suggestedDeposit));
                }}
              >
                <Sparkles className="h-3.5 w-3.5 text-[#EB5E4C]" /> Apply Suggested
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#57534E]">Daily Rental Price (₹) *</label>
                <Input type="number" min={50} value={dailyPrice} onChange={(e) => setDailyPrice(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#57534E]">Refundable Security Deposit (₹) *</label>
                <Input type="number" min={0} value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#57534E]">Min Rental Days</label>
                <Input type="number" min={1} max={30} value={minDays} onChange={(e) => setMinDays(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#57534E]">Max Rental Days</label>
                <Input type="number" min={1} max={90} value={maxDays} onChange={(e) => setMaxDays(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#57534E]">Late Fee / Day (₹)</label>
                <Input type="number" min={0} value={lateFee} onChange={(e) => setLateFee(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#57534E]">Physical Units</label>
                <Input type="number" min={1} max={20} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>

            <p className="text-xs text-[#2F5D46] font-medium tabular-nums">
              At {commissionPercent}% platform commission, you earn {formatINR(estNet)}/day (0% deducted from deposit).
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-editorial text-2xl font-semibold">5. Availability &amp; Blocked Dates</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-[#57534E]">Available From</label>
                <Input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#57534E]">Available Until</label>
                <Input type="date" value={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={currentlyInUse} onChange={(e) => setCurrentlyInUse(e.target.checked)} className="h-4 w-4" />
              Mark item currently in personal use
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
              <Input type="date" value={newBlockStart} onChange={(e) => setNewBlockStart(e.target.value)} />
              <Input type="date" value={newBlockEnd} onChange={(e) => setNewBlockEnd(e.target.value)} />
              <Input value={newBlockReason} onChange={(e) => setNewBlockReason(e.target.value)} placeholder="Reason" />
              <Button
                type="button"
                variant="subtle"
                onClick={() => {
                  if (!newBlockStart || !newBlockEnd || newBlockEnd < newBlockStart) return;
                  setBlockedRanges((p) => [...p, { start_date: newBlockStart, end_date: newBlockEnd, reason: newBlockReason || "Unavailable" }]);
                  setNewBlockStart("");
                  setNewBlockEnd("");
                  setNewBlockReason("");
                }}
              >
                <Plus className="h-4 w-4" /> Block Dates
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h3 className="font-editorial text-2xl font-semibold">6. Handover &amp; Location</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City * (e.g. Pune)" />
              <Input value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="Locality (e.g. Kothrud)" />
            </div>
            <label className="flex items-center justify-between rounded-xl border border-[#E4DFD7] p-4 text-sm cursor-pointer">
              <span>Allow Local Self-Pickup (Free)</span>
              <input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} className="h-4 w-4 accent-[#EB5E4C]" />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-[#E4DFD7] p-4 text-sm cursor-pointer">
              <span>Doorstep / Seller Delivery Available</span>
              <input type="checkbox" checked={sellerDelivery} onChange={(e) => setSellerDelivery(e.target.checked)} className="h-4 w-4 accent-[#EB5E4C]" />
            </label>
            {sellerDelivery && (
              <Input type="number" min={0} value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} placeholder="Delivery Charge (₹)" />
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h3 className="font-editorial text-2xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#2F5D46]" /> 7. Review &amp; Submit for Approval
            </h3>
            <div className="rounded-xl border border-[#E4DFD7] bg-[#FAF8F5] p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p><strong>{title || "—"}</strong> ({brand || "—"})</p>
                <p>Size {size} · {color || "—"} · {occasion}</p>
                <p>{city || "—"} {locality ? `(${locality})` : ""}</p>
              </div>
              <div className="space-y-1 tabular-nums">
                <p>Rent: <strong>{formatINR(dailyPrice)} / day</strong></p>
                <p>Deposit: <strong>{formatINR(securityDeposit)}</strong> refundable</p>
                <p>Photos uploaded: {images.length}</p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-[#E4DFD7] pt-5 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="subtle" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Previous
          </Button>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => handleSave(false)}>
              Save Draft
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" variant="accent" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                Next Step
              </Button>
            ) : (
              <Button type="button" variant="accent" disabled={submitting} onClick={() => handleSave(true)}>
                {submitting ? "Submitting..." : "Submit for Approval →"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
