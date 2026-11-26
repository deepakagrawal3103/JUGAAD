import Link from "next/link";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { getPublicMarketplaceShellData } from "@/lib/data/marketplace";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { BrowseFilters, QuickFilterStrip } from "@/components/marketplace/BrowseFilters";
import { ProductCard } from "@/components/marketplace/ProductCard";
import type { ProductWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const getParam = (key: string) => (typeof sp[key] === "string" ? sp[key].trim() : "");

  const [shell, sessionUser] = await Promise.all([
    getPublicMarketplaceShellData(),
    getCurrentSessionUser(),
  ]);

  const q = getParam("q");
  const categorySlug = getParam("category");
  const subcategory = getParam("subcategory");
  const size = getParam("size");
  const genderStyle = getParam("gender_style");
  const occasion = getParam("occasion");
  const color = getParam("color");
  const location = getParam("location");
  const condition = getParam("condition");
  const minPrice = Number(getParam("min_price") || 0);
  const maxPrice = Number(getParam("max_price") || 0);
  const duration = Number(getParam("duration") || 0);
  const startDate = getParam("start_date");
  const endDate = getParam("end_date");
  const sort = getParam("sort") || "recommended";
  const page = Math.max(1, Number(getParam("page") || 1));
  const limit = 16;

  let products: ProductWithRelations[] = [];
  let total = 0;
  let wishlistIds = new Set<string>();

  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabase();

    if (sessionUser) {
      const { data: w } = await supabase.from("wishlists").select("id").eq("user_id", sessionUser.userId).maybeSingle();
      if (w) {
        const { data: wi } = await supabase.from("wishlist_items").select("product_id").eq("wishlist_id", w.id);
        wishlistIds = new Set((wi ?? []).map((i) => i.product_id));
      }
    }

    let categoryId: string | null = null;
    let categoryMissing = false;
    if (categorySlug) {
      const { data: cat } = await supabase.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
      if (cat) categoryId = cat.id;
      else categoryMissing = true;
    }

    if (!categoryMissing) {
      let query = supabase
        .from("products")
        .select(
          `
          *,
          category:categories(id, name, slug),
          images:product_images(id, product_id, storage_path, public_url, angle_tag, sort_order, is_primary),
          seller:seller_profiles(id, display_name, city, locality, verification_status, total_rentals, rating_avg)
        `,
          { count: "exact" }
        )
        .eq("status", "APPROVED")
        .eq("is_active", true);

      if (q) {
        const safeQ = q.replace(/[%_,]/g, "");
        query = query.or(`title.ilike.%${safeQ}%,brand.ilike.%${safeQ}%`);
      }
      if (categoryId) query = query.eq("category_id", categoryId);
      if (subcategory) query = query.ilike("subcategory", `%${subcategory}%`);
      if (size) query = query.eq("size", size);
      if (genderStyle) query = query.eq("gender_style", genderStyle);
      if (occasion) query = query.eq("occasion", occasion);
      if (color) query = query.ilike("color", `%${color}%`);
      if (location) query = query.ilike("city", `%${location}%`);
      if (condition) query = query.eq("condition", condition);
      if (minPrice > 0) query = query.gte("daily_price", minPrice);
      if (maxPrice > 0) query = query.lte("daily_price", maxPrice);
      if (duration > 0) query = query.lte("min_rental_days", duration).gte("max_rental_days", duration);

      switch (sort) {
        case "newly_added": query = query.order("created_at", { ascending: false }); break;
        case "price_asc": query = query.order("daily_price", { ascending: true }); break;
        case "price_desc": query = query.order("daily_price", { ascending: false }); break;
        case "most_popular": query = query.order("rental_count", { ascending: false }); break;
        default: query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false }); break;
      }

      const from = (page - 1) * limit;
      const { data, count } = await query.range(from, from + limit - 1);
      products = (data as unknown as ProductWithRelations[]) ?? [];

      // Hide pieces that are currently out on active rent today
      const todayIST = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split("T")[0];
      const { data: activeRentItems } = await supabase
        .from("booking_items")
        .select("product_id, booking:bookings!inner(status)")
        .in("booking.status", ["CONFIRMED", "READY_FOR_PICKUP", "DISPATCHED", "RENTAL_ACTIVE", "RETURN_DUE"])
        .lte("start_date", todayIST)
        .gte("end_date", todayIST);
      const rentedTodayIds = new Set((activeRentItems ?? []).map((r: { product_id: string }) => r.product_id));
      products = products.filter((p) => !rentedTodayIds.has(p.id));
      total = Math.max(0, (count ?? products.length) - rentedTodayIds.size);

      if (startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        const checks = await Promise.all(
          products.map(async (p) => {
            const { data: avail } = await supabase.rpc("check_product_availability", {
              p_product_id: p.id,
              p_start_date: startDate,
              p_end_date: endDate,
            });
            return { id: p.id, ok: Boolean(avail?.available) };
          })
        );
        const okSet = new Set(checks.filter((c) => c.ok).map((c) => c.id));
        products = products.filter((p) => okSet.has(p.id));
        total = products.length;
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Stitch Quick Filter Pills */}
      <Suspense fallback={null}>
        <QuickFilterStrip />
      </Suspense>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#57534E]">
        <span>
          <strong className="text-[#161616]">{total}</strong> curated pieces {location ? `in ${location}` : "available"}
        </span>
        <span className="inline-flex items-center gap-1 text-[#2F5D46] font-medium">
          <ShieldCheck className="h-3.5 w-3.5" /> Dry-cleaned &amp; verified
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="lg:col-span-3">
          <Suspense fallback={<div className="h-96 rounded-2xl bg-[#ECE7E0] animate-pulse" />}>
            <BrowseFilters categories={shell.categories} />
          </Suspense>
        </aside>

        <div className="lg:col-span-9 space-y-8">
          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} initialWishlisted={wishlistIds.has(product.id)} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4 border-t border-[#E4DFD7]">
                  {page > 1 && (
                    <Link href={`/browse?page=${page - 1}`} className="rounded-xl border border-[#E4DFD7] bg-white px-4 py-2 text-xs">Previous</Link>
                  )}
                  <span className="text-xs text-[#57534E]">Page {page} of {totalPages}</span>
                  {page < totalPages && (
                    <Link href={`/browse?page=${page + 1}`} className="rounded-xl border border-[#E4DFD7] bg-white px-4 py-2 text-xs">Next</Link>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D6CFC5] bg-white p-14 text-center space-y-4">
              <p className="font-editorial text-2xl text-[#161616]">No matching rentals found</p>
              <p className="text-sm text-[#57534E] max-w-md mx-auto">
                Try clearing some filters or adjusting your rental dates. Approved listings appear here as soon as our curation team verifies them.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Link href="/browse" className="rounded-xl border border-[#161616] px-5 py-2.5 text-xs font-medium">Clear Filters</Link>
                <Link href="/seller/apply" className="rounded-xl bg-[#EB5E4C] text-white px-5 py-2.5 text-xs font-medium">List Your Outfit</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
