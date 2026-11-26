import { describe, expect, it } from "vitest";
import { buildWhatsAppPaymentUrl, normalizeWhatsAppNumber } from "../src/domain/whatsapp.js";
import { listingPayloadSchema, paymentProofSchema } from "../src/validators/schemas.js";

describe("Backend WhatsApp & Validators", () => {
  it("normalizes Indian 10-digit WhatsApp numbers and builds encoded prefill link", () => {
    expect(normalizeWhatsAppNumber("98765 43210")).toBe("919876543210");
    const url = buildWhatsAppPaymentUrl({
      whatsappNumber: "9876543210",
      bookingReference: "CL-20261126-A1B2C3",
      customerName: "Aanya Sharma",
      amountPaid: 1500,
      utrReference: "432910847291",
    });
    expect(url).toContain("https://wa.me/919876543210?text=");
    expect(decodeURIComponent(url!)).toContain("Booking ID: CL-20261126-A1B2C3");
  });

  it("rejects short UTR references and negative listing prices", () => {
    expect(
      paymentProofSchema.safeParse({
        booking_id: "00000000-0000-4000-8000-000000000001",
        utr_reference: "123",
        paid_amount: 1500,
      }).success
    ).toBe(false);

    expect(
      listingPayloadSchema.safeParse({
        title: "Silk Saree",
        category_id: "00000000-0000-4000-8000-000000000001",
        brand: "Raw Mango",
        description: "Detailed handwoven silk saree in pristine condition.",
        size: "Free Size",
        color: "Ivory",
        gender_style: "Women",
        occasion: "Wedding & Sangeet",
        condition: "LIKE_NEW",
        daily_price: -500,
        security_deposit: 1000,
        min_rental_days: 1,
        max_rental_days: 7,
        fulfillment_options: { pickup: true, seller_delivery: false, platform_delivery: false, delivery_fee: 0 },
        city: "Pune",
      }).success
    ).toBe(false);
  });
});
