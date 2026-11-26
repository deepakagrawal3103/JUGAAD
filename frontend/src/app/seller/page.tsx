import Link from "next/link";
import { requireSeller } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { SellerDashboardClient } from "@/components/dashboards/SellerDashboardClient";

export const dynamic = "force-dynamic";

export default async function SellerDashboardPage() {
  const ctx = await requireSeller();
  const sellerId = ctx.sellerProfileId;

  let listings: Array<any> = [];
  let bookingItems: Array<any> = [];
  let payouts: Array<any> = [];

  try {
    const { isSupabaseServerConfigured } = await import("@/lib/supabase/server");
    if (isSupabaseServerConfigured() && sellerId) {
      const supabase = await createServerSupabase();
      const [{ data: lData }, { data: bData }, { data: pData }] = await Promise.all([
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
      ]);
      listings = lData || [];
      bookingItems = bData || [];
      payouts = pData || [];
    }
  } catch {
    // fallback gracefully
  }

  // Local demo mode: supply rich sample data when Supabase is empty
  if (listings.length === 0) {
    const { MOCK_SELLER_LISTINGS, MOCK_SELLER_BOOKING_ITEMS, MOCK_SELLER_PAYOUTS } = await import("@/lib/data/mockDashboards");
    listings = MOCK_SELLER_LISTINGS as any;
    bookingItems = MOCK_SELLER_BOOKING_ITEMS as any;
    payouts = MOCK_SELLER_PAYOUTS as any;
  }

  const normalizedItems = (bookingItems ?? []).map((bi) => ({
    ...bi,
    booking: Array.isArray(bi.booking) ? bi.booking[0] ?? null : bi.booking,
  }));

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-[#E4DFD7] pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Seller Studio</p>
          <h1 className="font-editorial text-4xl font-semibold text-[#161616]">Apna Closet &amp; Kamai</h1>
        </div>
        <Link href="/dashboard" className="rounded-xl border border-[#E4DFD7] px-4 py-2 text-xs font-medium bg-white">
          Customer Dashboard
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
