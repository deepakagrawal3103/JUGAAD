import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { CustomerDashboardClient } from "@/components/dashboards/CustomerDashboardClient";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const ctx = await requireAuth("/login?redirect=/dashboard");

  let bookings: Array<any> = [];
  let profile: any = null;

  try {
    const { isSupabaseServerConfigured } = await import("@/lib/supabase/server");
    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabase();
      const [{ data: bData }, { data: pData }] = await Promise.all([
        supabase
          .from("bookings")
          .select(`
            id, booking_reference, status, payment_status,
            total_rental_amount, total_security_deposit, total_payable, created_at,
            items:booking_items(id, product_title_snapshot, product_image_snapshot, start_date, end_date, return_deadline),
            security_deposit:security_deposits(status, amount_held, refund_amount, deduction_amount)
          `)
          .eq("customer_id", ctx.userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_profiles")
          .select("full_name, phone, city, state, address_line, pincode, preferred_size")
          .eq("user_id", ctx.userId)
          .maybeSingle(),
      ]);
      bookings = bData || [];
      profile = pData;
    }
  } catch {
    // fallback gracefully
  }

  // If local demo mode, supply rich sample bookings
  if (bookings.length === 0 && process.env.NODE_ENV !== "production") {
    const { MOCK_CUSTOMER_BOOKINGS } = await import("@/lib/data/mockDashboards");
    bookings = MOCK_CUSTOMER_BOOKINGS;
  }

  const normalized = (bookings ?? []).map((b) => ({
    ...b,
    security_deposit: Array.isArray(b.security_deposit) ? b.security_deposit[0] ?? null : b.security_deposit,
  }));

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-[#E4DFD7] pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Customer Dashboard</p>
          <h1 className="font-editorial text-4xl font-semibold text-[#161616]">Welcome, {ctx.fullName}</h1>
        </div>
        <div className="flex gap-3">
          {ctx.role === "SELLER" || ctx.role === "ADMIN" ? (
            <Link href="/seller" className="rounded-xl border border-[#161616] px-4 py-2 text-xs font-medium">Switch to Seller Studio</Link>
          ) : (
            <Link href="/seller/apply" className="rounded-xl border border-[#161616] px-4 py-2 text-xs font-medium">Become a Seller</Link>
          )}
        </div>
      </div>

      <CustomerDashboardClient
        bookings={normalized as never}
        profile={
          profile ?? {
            full_name: ctx.fullName,
            phone: null,
            city: null,
            state: null,
            address_line: null,
            pincode: null,
            preferred_size: null,
          }
        }
        email={ctx.email}
      />
    </div>
  );
}
