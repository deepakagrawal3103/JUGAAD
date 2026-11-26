import { requireAuth } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { NotificationsClient } from "@/components/dashboards/NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const ctx = await requireAuth();
  const supabase = await createServerSupabase();

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="border-b border-[#E4DFD7] pb-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Inbox &amp; Updates</p>
        <h1 className="font-editorial text-4xl font-semibold text-[#161616]">Notifications</h1>
      </div>

      <NotificationsClient initialItems={data ?? []} />
    </div>
  );
}
