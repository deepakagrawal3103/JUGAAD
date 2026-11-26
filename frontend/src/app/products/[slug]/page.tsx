import { notFound } from "next/navigation";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { ProductDetailClient } from "@/components/marketplace/ProductDetailClient";
import { ProductCard } from "@/components/marketplace/ProductCard";
import type { ProductWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSupabaseServerConfigured()) notFound();

  const supabase = await createServerSupabase();
  const sessionUser = await getCurrentSessionUser();

  const { data: product } = await supabase
    .from("products")
    .select(`
      *,
      category:categories(id, name, slug),
      images:product_images(id, product_id, storage_path, public_url, angle_tag, sort_order, is_primary),
      seller:seller_profiles(id, display_name, city, locality, verification_status, total_rentals, rating_avg)
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (!product) notFound();

  const isPublic = product.status === "APPROVED" && product.is_active;
  const isOwner = sessionUser?.sellerProfileId === product.seller_id;
  const isAdmin = sessionUser?.role === "ADMIN";
  if (!isPublic && !isOwner && !isAdmin) notFound();

  const [{ data: unavailable }, { data: settings }, { data: related }] = await Promise.all([
    supabase.rpc("get_product_unavailable_dates", { p_product_id: product.id }),
    supabase.from("admin_settings").select("cleaning_buffer_days").eq("id", 1).maybeSingle(),
    supabase
      .from("products")
      .select(`
        *,
        category:categories(id, name, slug),
        images:product_images(id, product_id, storage_path, public_url, angle_tag, sort_order, is_primary),
        seller:seller_profiles(id, display_name, city, locality, verification_status, total_rentals, rating_avg)
      `)
      .eq("status", "APPROVED")
      .eq("is_active", true)
      .eq("category_id", product.category_id)
      .neq("id", product.id)
      .limit(4),
  ]);

  let initialWishlisted = false;
  if (sessionUser) {
    const { data: w } = await supabase.from("wishlists").select("id").eq("user_id", sessionUser.userId).maybeSingle();
    if (w) {
      const { data: wi } = await supabase
        .from("wishlist_items")
        .select("id")
        .eq("wishlist_id", w.id)
        .eq("product_id", product.id)
        .maybeSingle();
      initialWishlisted = Boolean(wi);
    }
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
      {!isPublic && (
        <div className="rounded-xl border border-[#E8D5B5] bg-[#FCF7EC] px-5 py-3 text-xs text-[#9A6B1E]">
          <strong>Preview Mode ({product.status}):</strong> Not publicly visible until approved by admin.
        </div>
      )}

      <ProductDetailClient
        product={product as unknown as ProductWithRelations}
        unavailableDates={unavailable ?? []}
        initialWishlisted={initialWishlisted}
        cleaningBufferDays={settings?.cleaning_buffer_days ?? 1}
      />

      {related && related.length > 0 && (
        <section className="space-y-6 border-t border-[#E4DFD7] pt-10">
          <h2 className="font-editorial text-3xl font-semibold text-[#161616]">Related Silhouettes</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {(related as unknown as ProductWithRelations[]).map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
