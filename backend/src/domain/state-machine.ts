import type { BookingStatus, ListingStatus, UserRole } from "../types/domain.js";

export const DEFAULT_BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  AWAITING_PAYMENT: ["PAYMENT_VERIFICATION_PENDING", "CANCELLED"],
  PAYMENT_VERIFICATION_PENDING: ["CONFIRMED", "AWAITING_PAYMENT", "CANCELLED", "DISPUTED"],
  CONFIRMED: ["READY_FOR_PICKUP", "DISPATCHED", "CANCELLED", "DISPUTED"],
  READY_FOR_PICKUP: ["RENTAL_ACTIVE", "DISPATCHED", "CANCELLED", "DISPUTED"],
  DISPATCHED: ["RENTAL_ACTIVE", "DISPUTED"],
  RENTAL_ACTIVE: ["RETURN_DUE", "RETURN_INITIATED", "DISPUTED"],
  RETURN_DUE: ["RETURN_INITIATED", "RETURNED", "DISPUTED"],
  RETURN_INITIATED: ["RETURNED", "DISPUTED"],
  RETURNED: ["INSPECTION_PENDING", "DISPUTED"],
  INSPECTION_PENDING: ["DEPOSIT_REFUND_PENDING", "DISPUTED"],
  DEPOSIT_REFUND_PENDING: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ["DEPOSIT_REFUND_PENDING", "COMPLETED", "CANCELLED"],
};

export function isValidBookingTransition(
  fromStatus: BookingStatus,
  toStatus: BookingStatus,
  customTransitions?: Record<string, string[]> | null
): boolean {
  const map = customTransitions ?? DEFAULT_BOOKING_TRANSITIONS;
  return (map[fromStatus] ?? []).includes(toStatus);
}

export function canRoleSetListingStatus(
  role: UserRole,
  currentStatus: ListingStatus,
  nextStatus: ListingStatus
): boolean {
  if (role === "ADMIN") return true;
  if (role !== "SELLER") return false;

  const sellerAllowedTargets: Record<ListingStatus, ListingStatus[]> = {
    DRAFT: ["DRAFT", "PENDING_REVIEW", "ARCHIVED"],
    CHANGES_REQUESTED: ["DRAFT", "PENDING_REVIEW", "ARCHIVED"],
    PENDING_REVIEW: ["PENDING_REVIEW", "DRAFT"],
    APPROVED: ["PAUSED", "ARCHIVED"],
    PAUSED: ["APPROVED", "ARCHIVED"],
    REJECTED: ["DRAFT", "ARCHIVED"],
    ARCHIVED: ["DRAFT"],
  };

  return (sellerAllowedTargets[currentStatus] ?? []).includes(nextStatus);
}
