import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { ProductCard } from "@/components/marketplace/ProductCard";
import type { ProductWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await requireAuth("/login?redirect=/wishlist");
  const supabase = await createServerSupabase();

  const { data: wishlist } = await supabase.from("wishlists").select("id").eq("user_id", user.userId).maybeSingle();

  let products: ProductWithRelations[] = [];
  if (wishlist) {
    const { data: items } = await supabase
      .from("wishlist_items")
      .select(`
        product:products(
          *,
          category:categories(id, name, slug),
          images:product_images(id, product_id, storage_path, public_url, sort_order, is_primary),
          seller:seller_profiles(id, display_name, city, locality, verification_status, total_rentals, rating_avg)
        )
      `)
      .eq("wishlist_id", wishlist.id)
      .order("created_at", { ascending: false });

    products = (items ?? [])
      .map((row: { product: unknown }) => row.product as ProductWithRelations | null)
      .filter((p): p is ProductWithRelations => Boolean(p && p.status === "APPROVED" && p.is_active));
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-[#E4DFD7] pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Saved Edit</p>
          <h1 className="font-editorial text-4xl font-semibold text-[#161616]">Your Wishlist</h1>
        </div>
        <Link href="/browse" className="text-xs font-semibold text-[#EB5E4C] hover:underline">
          Continue Exploring →
        </Link>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} initialWishlisted />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#D6CFC5] bg-white p-12 text-center space-y-4">
          <p className="font-editorial text-2xl text-[#161616]">Your wishlist is empty</p>
          <p className="text-sm text-[#57534E] max-w-md mx-auto">Tap the heart icon on any approved listing to save outfits.</p>
          <Link href="/browse" className="inline-block rounded-xl bg-[#EB5E4C] text-white px-6 py-3 text-xs font-medium uppercase tracking-widest">
            Explore Rentals
          </Link>
        </div>
      )}
    </div>
  );
}
