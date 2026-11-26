export const BRAND_CONFIG = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "ClosetLoop",
  tagline:
    process.env.NEXT_PUBLIC_BRAND_TAGLINE ||
    "Your next look doesn't have to be yours.",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  currencyCode: "INR",
  currencySymbol: "₹",
  timezone: "Asia/Kolkata",
  defaultCommissionPercent: 30,
  defaultReservationHoldMinutes: 20,
  defaultCleaningBufferDays: 1,
} as const;

export const OCCASIONS = [
  "Weddings & Sangeet",
  "Cocktail & Party",
  "College & Fest",
  "Festive & Puja",
  "Photoshoot",
  "Vacation & Trip",
  "Formal & Work",
  "Everyday Luxe",
] as const;

export const SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "Free Size",
  "UK 5",
  "UK 6",
  "UK 7",
  "UK 8",
  "UK 9",
  "UK 10",
  "UK 11",
] as const;

export const GENDER_STYLES = ["Women", "Men", "Unisex"] as const;

export const PRODUCT_CONDITIONS = [
  { value: "NEW_WITH_TAGS", label: "New With Tags" },
  { value: "LIKE_NEW", label: "Like New" },
  { value: "GENTLY_USED", label: "Gently Used" },
  { value: "VINTAGE", label: "Vintage / Archival" },
] as const;

export const POLICY_LINKS = [
  { slug: "rental-policy", label: "Rental Policy" },
  { slug: "cancellation-policy", label: "Cancellation Policy" },
  { slug: "refund-policy", label: "Refund Policy" },
  { slug: "security-deposit-policy", label: "Security Deposit Policy" },
  { slug: "late-return-policy", label: "Late Return Policy" },
  { slug: "damage-policy", label: "Damage Policy" },
  { slug: "privacy-policy", label: "Privacy Policy" },
  { slug: "terms-and-conditions", label: "Terms & Conditions" },
  { slug: "seller-agreement", label: "Seller Agreement" },
] as const;
