import { z } from "zod";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.");

export const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  address_line: z.string().trim().max(250).optional().nullable(),
  pincode: z.string().trim().max(12).optional().nullable(),
  preferred_size: z.string().trim().max(20).optional().nullable(),
});

export const sellerApplySchema = z.object({
  display_name: z.string().trim().min(2, "Closet or boutique name is required.").max(80),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required.").max(80),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  locality: z.string().trim().max(120).optional().or(z.literal("")),
  pickup_address: z.string().trim().min(5, "Pickup address is required for fulfillment.").max(300),
  payout_upi_id: z.string().trim().min(3, "Payout UPI ID is required.").max(100),
  payout_account_name: z.string().trim().min(2, "Account holder name is required.").max(100),
});

export const listingImageInputSchema = z.object({
  storage_path: z.string().min(1),
  public_url: z.string().url(),
  angle_tag: z.string().max(40).optional().nullable(),
  sort_order: z.number().int().min(0).max(20),
  is_primary: z.boolean(),
});

export const listingPayloadSchema = z.object({
  title: z.string().trim().min(4, "Product title must be at least 4 characters.").max(140),
  category_id: z.string().uuid("Select a valid category."),
  subcategory: z.string().trim().max(80).optional().nullable(),
  brand: z.string().trim().min(1, "Brand is required.").max(80),
  description: z.string().trim().min(20, "Provide a detailed description (min 20 chars).").max(2500),
  size: z.string().trim().min(1, "Size is required.").max(30),
  color: z.string().trim().min(1, "Color is required.").max(40),
  gender_style: z.string().trim().min(1).max(30),
  occasion: z.string().trim().min(1).max(60),
  condition: z.enum(["NEW_WITH_TAGS", "LIKE_NEW", "GENTLY_USED", "VINTAGE"]),
  fabric: z.string().trim().max(80).optional().nullable(),
  original_retail_price: z.number().min(0).max(5000000).optional().nullable(),
  daily_price: z.number().positive("Daily rental price must be positive.").max(500000),
  security_deposit: z.number().min(0, "Security deposit cannot be negative.").max(1000000),
  min_rental_days: z.number().int().min(1).max(90),
  max_rental_days: z.number().int().min(1).max(180),
  duration_pricing: z
    .array(
      z.object({
        min_days: z.number().int().min(2),
        daily_price: z.number().positive(),
      })
    )
    .optional()
    .default([]),
  late_fee_per_day: z.number().min(0).max(100000).default(0),
  quantity: z.number().int().min(1).max(50).default(1),
  fulfillment_options: z.object({
    pickup: z.boolean(),
    seller_delivery: z.boolean(),
    platform_delivery: z.boolean().default(false),
    delivery_fee: z.number().min(0).max(50000).default(0),
    delivery_locations: z.array(z.string().trim().max(100)).optional().default([]),
  }),
  city: z.string().trim().min(2, "City is required.").max(80),
  locality: z.string().trim().max(120).optional().nullable(),
  available_from: dateOnlySchema.optional().nullable(),
  available_until: dateOnlySchema.optional().nullable(),
  currently_in_use: z.boolean().optional().default(false),
  blocked_ranges: z
    .array(
      z.object({
        start_date: dateOnlySchema,
        end_date: dateOnlySchema,
        reason: z.string().max(160).optional(),
      })
    )
    .optional()
    .default([]),
  images: z.array(listingImageInputSchema).max(12).optional().default([]),
  submit_for_review: z.boolean().default(false),
});

export const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  start_date: dateOnlySchema,
  end_date: dateOnlySchema,
  fulfillment_type: z.enum(["PICKUP", "SELLER_DELIVERY", "PLATFORM_DELIVERY"]),
});

export const checkoutSchema = z.object({
  delivery_address: z
    .object({
      full_name: z.string().trim().min(2).max(100),
      phone: z.string().trim().min(8).max(20),
      address_line: z.string().trim().min(5).max(300),
      city: z.string().trim().min(2).max(80),
      pincode: z.string().trim().min(4).max(12),
      college_name: z.string().trim().min(2).max(150).optional().nullable(),
      enrollment_number: z.string().trim().min(2).max(80).optional().nullable(),
    })
    .optional()
    .nullable(),
  customer_notes: z.string().trim().max(500).optional().nullable(),
});

export const paymentProofSchema = z.object({
  booking_id: z.string().uuid(),
  utr_reference: z.string().trim().min(6, "Enter a valid UTR / transaction reference.").max(80),
  paid_amount: z.number().positive(),
  paid_at: z.string().optional(),
  screenshot_path: z.string().trim().max(400).optional().nullable(),
  notes: z.string().trim().max(400).optional().nullable(),
});

export const adminPaymentDecisionSchema = z.object({
  decision: z.enum(["VERIFIED", "REJECTED", "MORE_PROOF_REQUESTED"]),
  note: z.string().trim().max(500).optional().nullable(),
});

export const adminSettingsSchema = z.object({
  brand_name: z.string().trim().min(2).max(60),
  brand_tagline: z.string().trim().min(2).max(160),
  commission_percent: z.number().min(0).max(80),
  reservation_hold_minutes: z.number().int().min(5).max(1440),
  cleaning_buffer_days: z.number().int().min(0).max(14),
  late_fee_grace_hours: z.number().int().min(0).max(72),
  late_fee_policy_summary: z.string().trim().min(5).max(600),
  upi_id: z.string().trim().max(120),
  upi_display_name: z.string().trim().max(120),
  upi_qr_url: z.string().trim().max(500),
  whatsapp_number: z.string().trim().max(24),
  payment_instructions: z.string().trim().min(5).max(1000),
});

export const returnInspectionSchema = z.object({
  booking_id: z.string().uuid(),
  booking_item_id: z.string().uuid().optional().nullable(),
  condition_status: z.enum(["GOOD", "MINOR_WEAR", "DAMAGED", "MISSING_ITEMS", "LATE"]),
  damage_found: z.boolean(),
  deduction_recommended: z.number().min(0).max(1000000),
  evidence_paths: z.array(z.string()).max(8).default([]),
  notes: z.string().trim().max(800).optional().nullable(),
});

export const disputeCreateSchema = z.object({
  booking_id: z.string().uuid(),
  dispute_type: z.enum([
    "DAMAGED_PRODUCT",
    "MISSING_PRODUCT",
    "LATE_RETURN",
    "INCORRECT_PRODUCT",
    "REFUND_DISPUTE",
    "PAYMENT_DISPUTE",
  ]),
  description: z.string().trim().min(10).max(1500),
  evidence_paths: z.array(z.string()).max(8).default([]),
});
