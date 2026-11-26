import { describe, expect, it } from "vitest";
import {
  aggregateBookingPricing,
  calculateItemPricing,
  resolveEffectiveDailyRate,
} from "../src/domain/pricing.js";

describe("Backend Pricing & Commission Engine", () => {
  it("computes 30% commission on rental only and excludes security deposit", () => {
    const res = calculateItemPricing({
      dailyPrice: 500,
      securityDeposit: 1000,
      startDate: "2026-12-01",
      endDate: "2026-12-03",
      commissionPercent: 30,
      fulfillmentType: "PICKUP",
    });

    expect(res.rentalDays).toBe(3);
    expect(res.rentalAmount).toBe(1500);
    expect(res.platformCommission).toBe(450);
    expect(res.sellerEarnings).toBe(1050);
    expect(res.securityDeposit).toBe(1000);
    expect(res.customerPayable).toBe(2500);
  });

  it("supports configurable commission percentages and delivery fees", () => {
    const res = calculateItemPricing({
      dailyPrice: 1200,
      securityDeposit: 2500,
      startDate: "2026-11-14",
      endDate: "2026-11-16",
      commissionPercent: 30,
      fulfillmentType: "SELLER_DELIVERY",
      fulfillmentOptions: { delivery_fee: 120 },
    });

    expect(res.rentalDays).toBe(3);
    expect(res.rentalAmount).toBe(3600);
    expect(res.deliveryFee).toBe(120);
    expect(res.securityDeposit).toBe(2500);
    expect(res.customerPayable).toBe(6220);
  });

  it("applies multi-day duration pricing tiers accurately", () => {
    const rate = resolveEffectiveDailyRate(1200, 5, [
      { min_days: 3, daily_price: 1200 },
      { min_days: 5, daily_price: 1080 },
    ]);
    expect(rate).toBe(1080);
  });

  it("aggregates multi-item cart totals cleanly", () => {
    const a = calculateItemPricing({
      dailyPrice: 1000,
      securityDeposit: 500,
      startDate: "2026-12-01",
      endDate: "2026-12-02",
      commissionPercent: 30,
      fulfillmentType: "PICKUP",
    });
    const b = calculateItemPricing({
      dailyPrice: 600,
      securityDeposit: 800,
      startDate: "2026-12-05",
      endDate: "2026-12-05",
      commissionPercent: 30,
      fulfillmentType: "SELLER_DELIVERY",
      fulfillmentOptions: { delivery_fee: 100 },
    });

    const total = aggregateBookingPricing([a, b]);
    expect(total.totalRentalAmount).toBe(2600);
    expect(total.totalCommissionAmount).toBe(780);
    expect(total.totalSellerEarnings).toBe(1820);
    expect(total.totalSecurityDeposit).toBe(1300);
    expect(total.totalDeliveryFee).toBe(100);
    expect(total.totalPayable).toBe(4000);
  });
});
