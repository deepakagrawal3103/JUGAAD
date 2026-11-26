import { notFound } from "next/navigation";
import { requireSeller } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { getPublicMarketplaceShellData } from "@/lib/data/marketplace";
import { ListingWizard } from "@/components/seller/ListingWizard";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireSeller();
  const { id } = await params;

  const [shell, supabase] = await Promise.all([
    getPublicMarketplaceShellData(),
    createServerSupabase(),
  ]);

  const { data: product } = await supabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("id", id)
    .maybeSingle();

  if (!product) notFound();
  if (ctx.role !== "ADMIN" && product.seller_id !== ctx.sellerProfileId) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-[#E4DFD7] pb-5 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Edit Listing · {product.status}</p>
        <h1 className="font-editorial text-4xl font-semibold text-[#161616]">{product.title}</h1>
        {product.admin_feedback && (
          <div className="rounded-xl border border-[#E8D5B5] bg-[#FCF7EC] p-4 text-xs text-[#9A6B1E]">
            <strong>Admin Review Note:</strong> {product.admin_feedback}
          </div>
        )}
      </div>

      <ListingWizard
        categories={shell.categories}
        commissionPercent={shell.settings.commission_percent}
        initialListing={product}
      />
    </div>
  );
}
