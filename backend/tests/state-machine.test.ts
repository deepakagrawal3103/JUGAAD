import { describe, expect, it } from "vitest";
import {
  canRoleSetListingStatus,
  isValidBookingTransition,
} from "../src/domain/state-machine.js";

describe("Backend Role & State Machine Guards", () => {
  it("prevents sellers from self-approving or rejecting listings", () => {
    expect(canRoleSetListingStatus("SELLER", "DRAFT", "APPROVED")).toBe(false);
    expect(canRoleSetListingStatus("SELLER", "PENDING_REVIEW", "APPROVED")).toBe(false);
    expect(canRoleSetListingStatus("SELLER", "PENDING_REVIEW", "REJECTED")).toBe(false);
    expect(canRoleSetListingStatus("SELLER", "DRAFT", "PENDING_REVIEW")).toBe(true);
    expect(canRoleSetListingStatus("ADMIN", "PENDING_REVIEW", "APPROVED")).toBe(true);
  });

  it("enforces valid booking return lifecycle transitions", () => {
    expect(isValidBookingTransition("AWAITING_PAYMENT", "CONFIRMED")).toBe(false);
    expect(isValidBookingTransition("AWAITING_PAYMENT", "PAYMENT_VERIFICATION_PENDING")).toBe(true);
    expect(isValidBookingTransition("PAYMENT_VERIFICATION_PENDING", "CONFIRMED")).toBe(true);
    expect(isValidBookingTransition("RETURN_INITIATED", "RETURNED")).toBe(true);
    expect(isValidBookingTransition("COMPLETED", "CANCELLED")).toBe(false);
  });
});
