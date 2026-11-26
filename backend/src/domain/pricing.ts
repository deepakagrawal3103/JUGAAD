import type { DurationPricingTier, FulfillmentOptions, FulfillmentType } from "../types/domain.js";
import { calculateRentalDays } from "./dates.js";

export function roundINR(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface ItemPricingInput {
  dailyPrice: number;
  securityDeposit: number;
  startDate: string;
  endDate: string;
  commissionPercent: number;
  fulfillmentType: FulfillmentType;
  fulfillmentOptions?: Partial<FulfillmentOptions> | null;
  durationPricing?: DurationPricingTier[] | null;
}

export interface ItemPricingBreakdown {
  rentalDays: number;
  effectiveDailyRate: number;
  rentalAmount: number;
  commissionPercent: number;
  platformCommission: number;
  sellerEarnings: number;
  securityDeposit: number;
  deliveryFee: number;
  customerPayable: number;
}

export function resolveEffectiveDailyRate(
  baseDailyPrice: number,
  rentalDays: number,
  tiers?: DurationPricingTier[] | null
): number {
  if (!tiers || tiers.length === 0) return roundINR(baseDailyPrice);
  const matching = tiers
    .filter((t) => t.min_days <= rentalDays && t.daily_price > 0)
    .sort((a, b) => b.min_days - a.min_days);
  return roundINR(matching[0]?.daily_price ?? baseDailyPrice);
}

export function calculateItemPricing(input: ItemPricingInput): ItemPricingBreakdown {
  if (input.dailyPrice <= 0) throw new Error("Daily rental price must be greater than zero.");
  if (input.securityDeposit < 0) throw new Error("Security deposit cannot be negative.");
  if (input.commissionPercent < 0 || input.commissionPercent > 100) {
    throw new Error("Commission percentage must be between 0 and 100.");
  }

  const rentalDays = calculateRentalDays(input.startDate, input.endDate);
  const effectiveDailyRate = resolveEffectiveDailyRate(
    input.dailyPrice,
    rentalDays,
    input.durationPricing
  );
  const rentalAmount = roundINR(effectiveDailyRate * rentalDays);
  const platformCommission = roundINR(rentalAmount * (input.commissionPercent / 100));
  const sellerEarnings = roundINR(rentalAmount - platformCommission);
  const securityDeposit = roundINR(input.securityDeposit);
  const deliveryFee =
    input.fulfillmentType === "SELLER_DELIVERY"
      ? roundINR(Math.max(0, Number(input.fulfillmentOptions?.delivery_fee ?? 0)))
      : 0;
  const customerPayable = roundINR(rentalAmount + securityDeposit + deliveryFee);

  return {
    rentalDays,
    effectiveDailyRate,
    rentalAmount,
    commissionPercent: roundINR(input.commissionPercent),
    platformCommission,
    sellerEarnings,
    securityDeposit,
    deliveryFee,
    customerPayable,
  };
}

export function aggregateBookingPricing(items: ItemPricingBreakdown[]) {
  return items.reduce(
    (acc, item) => ({
      totalRentalAmount: roundINR(acc.totalRentalAmount + item.rentalAmount),
      totalCommissionAmount: roundINR(acc.totalCommissionAmount + item.platformCommission),
      totalSellerEarnings: roundINR(acc.totalSellerEarnings + item.sellerEarnings),
      totalSecurityDeposit: roundINR(acc.totalSecurityDeposit + item.securityDeposit),
      totalDeliveryFee: roundINR(acc.totalDeliveryFee + item.deliveryFee),
      totalPayable: roundINR(acc.totalPayable + item.customerPayable),
    }),
    {
      totalRentalAmount: 0,
      totalCommissionAmount: 0,
      totalSellerEarnings: 0,
      totalSecurityDeposit: 0,
      totalDeliveryFee: 0,
      totalPayable: 0,
    }
  );
}
