export type UserRole = "CUSTOMER" | "SELLER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";
export type ListingStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "PAUSED"
  | "ARCHIVED";

export type FulfillmentType = "PICKUP" | "SELLER_DELIVERY" | "PLATFORM_DELIVERY";

export type BookingStatus =
  | "AWAITING_PAYMENT"
  | "PAYMENT_VERIFICATION_PENDING"
  | "CONFIRMED"
  | "READY_FOR_PICKUP"
  | "DISPATCHED"
  | "RENTAL_ACTIVE"
  | "RETURN_DUE"
  | "RETURN_INITIATED"
  | "RETURNED"
  | "INSPECTION_PENDING"
  | "DEPOSIT_REFUND_PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export interface FulfillmentOptions {
  pickup: boolean;
  seller_delivery: boolean;
  platform_delivery: boolean;
  delivery_fee: number;
}

export interface DurationPricingTier {
  min_days: number;
  daily_price: number;
}

export interface AuthUserContext {
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  fullName: string;
  sellerProfileId: string | null;
}
