import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { getPublicMarketplaceShellData } from "@/lib/data/marketplace";
import { PaymentCheckoutClient } from "@/components/checkout/PaymentCheckoutClient";

export const dynamic = "force-dynamic";

export default async function CheckoutBookingPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const ctx = await requireAuth();
  const { bookingId } = await params;

  const [shell, supabase] = await Promise.all([
    getPublicMarketplaceShellData(),
    createServerSupabase(),
  ]);

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id, booking_reference, customer_id, status, payment_status,
      total_rental_amount, total_security_deposit, total_delivery_fee,
      total_payable, payment_expires_at,
      items:booking_items(id, product_title_snapshot, product_image_snapshot, start_date, end_date, rental_days, rental_amount, security_deposit, delivery_fee),
      payment:payments(rejection_reason)
    `)
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || (booking.customer_id !== ctx.userId && ctx.role !== "ADMIN")) {
    notFound();
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-[#E4DFD7] pb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Booking &amp; Security Deposit Checkout</p>
        <h1 className="font-editorial text-4xl font-semibold text-[#161616]">Complete UPI Payment</h1>
      </div>

      <PaymentCheckoutClient
        booking={{
          ...booking,
          payment: Array.isArray(booking.payment) ? booking.payment[0] : booking.payment,
        }}
        customerName={ctx.fullName}
        upiSettings={{
          upi_id: shell.settings.upi_id,
          upi_display_name: shell.settings.upi_display_name,
          upi_qr_url: shell.settings.upi_qr_url,
          whatsapp_number: shell.settings.whatsapp_number,
          payment_instructions: shell.settings.payment_instructions,
        }}
      />
    </div>
  );
}
