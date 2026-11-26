import { requireAuth } from "@/lib/auth/session";
import { CartClient } from "@/components/marketplace/CartClient";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  await requireAuth("/login?redirect=/cart");

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-[#E4DFD7] pb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Server-Validated</p>
        <h1 className="font-editorial text-4xl font-semibold text-[#161616]">Rental Bag</h1>
      </div>

      <CartClient />
    </div>
  );
}
