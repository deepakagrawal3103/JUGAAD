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

export type ProductCondition = "NEW_WITH_TAGS" | "LIKE_NEW" | "GENTLY_USED" | "VINTAGE";
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

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
}

export interface ProductImageRecord {
  id: string;
  product_id: string;
  storage_path: string;
  public_url: string;
  angle_tag: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface PublicSellerSummary {
  id: string;
  display_name: string;
  city: string;
  locality: string | null;
  verification_status: string;
  total_rentals: number;
  rating_avg: number;
}

export interface ProductWithRelations {
  id: string;
  seller_id: string;
  category_id: string;
  subcategory: string | null;
  title: string;
  slug: string;
  brand: string;
  description: string;
  size: string;
  color: string;
  gender_style: string;
  occasion: string;
  condition: ProductCondition;
  fabric: string | null;
  original_retail_price: number | null;
  daily_price: number;
  security_deposit: number;
  min_rental_days: number;
  max_rental_days: number;
  duration_pricing: { min_days: number; daily_price: number }[];
  late_fee_per_day: number;
  quantity: number;
  fulfillment_options: {
    pickup: boolean;
    seller_delivery: boolean;
    platform_delivery: boolean;
    delivery_fee: number;
    delivery_locations?: string[];
  };
  city: string;
  locality: string | null;
  status: ListingStatus;
  is_active: boolean;
  is_featured: boolean;
  is_trending: boolean;
  admin_feedback: string | null;
  rental_count: number;
  created_at: string;
  updated_at: string;
  category?: CategoryRecord | null;
  images?: ProductImageRecord[];
  seller?: PublicSellerSummary | null;
}

export interface AdminSettingsRecord {
  id: number;
  brand_name: string;
  brand_tagline: string;
  commission_percent: number;
  reservation_hold_minutes: number;
  cleaning_buffer_days: number;
  late_fee_grace_hours: number;
  late_fee_policy_summary: string;
  upi_id: string;
  upi_display_name: string;
  upi_qr_url: string;
  whatsapp_number: string;
  payment_instructions: string;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  AWAITING_PAYMENT: "Awaiting Payment",
  PAYMENT_VERIFICATION_PENDING: "Verification Pending",
  CONFIRMED: "Confirmed",
  READY_FOR_PICKUP: "Ready for Pickup",
  DISPATCHED: "Dispatched",
  RENTAL_ACTIVE: "Rental Active",
  RETURN_DUE: "Return Due",
  RETURN_INITIATED: "Return Initiated",
  RETURNED: "Returned",
  INSPECTION_PENDING: "Inspection Pending",
  DEPOSIT_REFUND_PENDING: "Deposit Refund Pending",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Published",
  REJECTED: "Rejected",
  PAUSED: "Paused",
  ARCHIVED: "Archived",
};
