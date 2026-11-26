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
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-[#E4DFD7] bg-[#F3EFEA]">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs uppercase tracking-widest text-[#8C857B]">
            No Image
          </div>
        )}

        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[#2F5D46] shadow-xs">
          <ShieldCheck className="h-3 w-3" /> Verified
        </span>

        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full bg-white/95 flex items-center justify-center text-[#161616] hover:bg-[#161616] hover:text-white transition-colors shadow-xs"
        >
          <Heart className={`h-4 w-4 ${wishlisted ? "fill-[#EB5E4C] text-[#EB5E4C]" : ""}`} />
        </button>
      </div>

      <div className="pt-2.5 space-y-0.5">
        <h3 className="font-sans text-sm font-semibold text-[#161616] truncate group-hover:underline">
          {product.title}
        </h3>

        <p className="text-xs text-[#8C857B] truncate">
          {product.brand} • Size {product.size}
        </p>

        <div className="pt-1">
          <p className="text-sm font-bold text-[#161616] tabular-nums">
            {formatINR(product.daily_price)}{" "}
            <span className="text-xs font-normal text-[#57534E]">/ day</span>
          </p>
          <p className="text-[11px] text-[#8C857B] tabular-nums">
            {formatINR(product.security_deposit)} ref. deposit
          </p>
        </div>
      </div>
    </Link>
  );
}
