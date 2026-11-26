import Link from "next/link";
import { requireSeller } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { SellerDashboardClient } from "@/components/dashboards/SellerDashboardClient";

export const dynamic = "force-dynamic";

export default async function SellerDashboardPage() {
  const ctx = await requireSeller();
  const supabase = await createServerSupabase();
  const sellerId = ctx.sellerProfileId;

  const [{ data: listings }, { data: bookingItems }, { data: payouts }] = sellerId
    ? await Promise.all([
        supabase
          .from("products")
          .select("*, images:product_images(public_url, is_primary)")
          .eq("seller_id", sellerId)
          .order("updated_at", { ascending: false }),
        supabase
          .from("booking_items")
          .select(`
            id, booking_id, product_title_snapshot, start_date, end_date,
            rental_amount, commission_amount, seller_earnings, fulfillment_type, return_deadline,
            booking:bookings(id, booking_reference, status, payment_status)
          `)
          .eq("seller_id", sellerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("seller_payouts")
          .select("*")
          .eq("seller_id", sellerId)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const normalizedItems = (bookingItems ?? []).map((bi) => ({
    ...bi,
    booking: Array.isArray(bi.booking) ? bi.booking[0] ?? null : bi.booking,
  }));

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-[#E4DFD7] pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Seller Studio</p>
          <h1 className="font-editorial text-4xl font-semibold text-[#161616]">Closet Management &amp; Earnings</h1>
        </div>
        <Link href="/dashboard" className="rounded-xl border border-[#E4DFD7] px-4 py-2 text-xs font-medium bg-white">
          Customer View
        </Link>
      </div>

      <SellerDashboardClient
        listings={(listings as never) ?? []}
        bookingItems={normalizedItems as never}
        payouts={payouts ?? []}
      />
    </div>
  );
}
