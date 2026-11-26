"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { formatINR } from "@/lib/utils";
import type { ProductWithRelations } from "@/types/database";

export function ProductCard({
  product,
  initialWishlisted = false,
}: {
  product: ProductWithRelations;
  initialWishlisted?: boolean;
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [toggling, setToggling] = useState(false);

  const primaryImage =
    product.images?.find((img) => img.is_primary)?.public_url ||
    product.images?.[0]?.public_url;

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    try {
      const res = await apiFetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id }),
      });
      if (res.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setWishlisted(Boolean(data.wishlisted));
      }
    } finally {
      setToggling(false);
    }
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block rounded-sm border border-[#F0F0F0] bg-white p-2.5 sm:p-3 hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-[#F5F7FA]">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs uppercase tracking-widest text-[#878787]">
            No Image
          </div>
        )}

        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-sm bg-[#388E3C] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
          <ShieldCheck className="h-3 w-3" /> Assured
        </span>

        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/95 flex items-center justify-center text-[#878787] hover:text-[#2874F0] transition-colors shadow-xs"
        >
          <Heart className={`h-4 w-4 ${wishlisted ? "fill-[#FF4343] text-[#FF4343]" : ""}`} />
        </button>
      </div>

      <div className="pt-2.5 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#878787] truncate">
          {product.brand} · Size {product.size}
        </p>

        <h3 className="text-xs sm:text-sm font-medium text-[#212121] line-clamp-1 group-hover:text-[#2874F0]">
          {product.title}
        </h3>

        <div className="pt-0.5 flex flex-wrap items-baseline gap-1.5 tabular-nums">
          <span className="text-sm sm:text-base font-bold text-[#212121]">
            {formatINR(product.daily_price)}
          </span>
          <span className="text-[11px] text-[#878787]">/ day</span>
        </div>

        <p className="text-[11px] font-medium text-[#388E3C] tabular-nums">
          +{formatINR(product.security_deposit)} Refundable Deposit
        </p>
      </div>
    </Link>
  );
}
