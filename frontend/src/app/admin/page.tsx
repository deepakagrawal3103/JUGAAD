import { requireAdmin } from "@/lib/auth/session";
import { serverApiFetch } from "@/lib/api/client";
import { getPublicMarketplaceShellData } from "@/lib/data/marketplace";
import { AdminDashboardClient } from "@/components/dashboards/AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const ctx = await requireAdmin();
  const shell = await getPublicMarketplaceShellData();

  let adminData: Record<string, unknown> | null = null;
  try {
    const res = await serverApiFetch("/api/admin/dashboard", ctx.accessToken);
    if (res.ok) {
      adminData = await res.json();
    }
  } catch {
    adminData = null;
  }

  const fallbackMetrics = {
    totalUsers: 0,
    totalSellers: 0,
    activeListings: 0,
    pendingListings: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    activeRentals: 0,
    paymentPendingCount: 0,
    rentalVolume: 0,
    platformCommission: 0,
    sellerEarnings: 0,
    refundsPending: 0,
    depositsHeld: 0,
    returnsPending: 0,
    openDisputes: 0,
  };

  // Local demo mode: supply rich sample data when backend is unavailable
  if (!adminData) {
    const {
      MOCK_ADMIN_METRICS,
      MOCK_ADMIN_PAYMENT_QUEUE,
      MOCK_ADMIN_LISTINGS,
      MOCK_ADMIN_BOOKINGS,
      MOCK_ADMIN_DEPOSITS,
      MOCK_ADMIN_PAYOUTS,
      MOCK_ADMIN_DISPUTES,
      MOCK_ADMIN_USERS,
    } = await import("@/lib/data/mockDashboards");
    adminData = {
      metrics: MOCK_ADMIN_METRICS,
      paymentQueue: MOCK_ADMIN_PAYMENT_QUEUE,
      listings: MOCK_ADMIN_LISTINGS,
      bookings: MOCK_ADMIN_BOOKINGS,
      deposits: MOCK_ADMIN_DEPOSITS,
      payouts: MOCK_ADMIN_PAYOUTS,
      disputes: MOCK_ADMIN_DISPUTES,
      users: MOCK_ADMIN_USERS,
    };
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-[#E4DFD7] pb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#EB5E4C]">Protected Operations</p>
        <h1 className="font-editorial text-4xl font-semibold text-[#161616]">Admin Control Panel</h1>
      </div>

      {!adminData && (
        <div className="rounded-xl border border-[#E8D5B5] bg-[#FCF7EC] p-4 text-xs text-[#9A6B1E]">
          Ensure the standalone backend API server is running on <code>{process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}</code> to load Admin metrics and queues.
        </div>
      )}

      <AdminDashboardClient
        metrics={(adminData?.metrics as never) ?? fallbackMetrics}
        listings={(adminData?.listings as never) ?? []}
        paymentQueue={(adminData?.paymentQueue as never) ?? []}
        bookings={(adminData?.bookings as never) ?? []}
        deposits={(adminData?.deposits as never) ?? []}
        payouts={(adminData?.payouts as never) ?? []}
        disputes={(adminData?.disputes as never) ?? []}
        users={(adminData?.users as never) ?? []}
        categories={(adminData?.categories as never) ?? shell.categories}
        policies={(adminData?.policies as never) ?? []}
        settings={(adminData?.settings as never) ?? shell.settings}
      />
    </div>
  );
}
