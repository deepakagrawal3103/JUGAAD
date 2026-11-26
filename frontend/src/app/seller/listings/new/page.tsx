import { requireSeller } from "@/lib/auth/session";
import { getPublicMarketplaceShellData } from "@/lib/data/marketplace";
import { ListingWizard } from "@/components/seller/ListingWizard";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  await requireSeller();
  const shell = await getPublicMarketplaceShellData();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-[#E4DFD7] pb-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Seller Studio</p>
        <h1 className="font-editorial text-4xl font-semibold text-[#161616]">Create Rental Listing</h1>
      </div>

      <ListingWizard
        categories={shell.categories}
        commissionPercent={shell.settings.commission_percent}
      />
    </div>
  );
}
