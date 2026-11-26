# ClosetLoop — Phased Development Plan

## Phase 1 — Foundation
- Initialize Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui architecture.
- Implement centralized brand configuration (`src/config/brand.ts`) and editorial design tokens.
- Author full Supabase PostgreSQL schema (`supabase/migrations/001_initial_schema.sql`), RLS policies (`002_rls_policies.sql`), atomic booking RPCs (`003_booking_engine.sql`), and seed script (`004_dev_seed.sql`).
- Set up Supabase Auth (Register, Login, Logout, session middleware), User Profiles, Role-based access control (`CUSTOMER`, `SELLER`, `ADMIN`).
- Build responsive Header/Navigation, Footer, Policy page scaffolds, and full database-connected Homepage (Hero, CTAs, Categories, Occasions, Featured, Trending, Recently Added, How Renting Works, Become a Seller, Benefits, Empty states).

## Phase 2 — Marketplace & Seller Listings
- Product Search & Discovery page (`/browse`) with working search (title/brand) and filters (category, subcategory, size, gender/style, occasion, color, price range, duration, location, date availability, condition) + sorting & pagination.
- Product Detail Page (`/products/[slug]`) with gallery & zoom modal, transparent rent vs. deposit split, seller display info (zero private PII exposed), availability calendar, rental date selector, policies, wishlist toggle, and related products.
- Wishlist endpoints & UI.
- Seller Onboarding (`/seller/apply`) and 7-Step Listing Creation Wizard (`/seller/listings/new` & edit drafts) with real cloud image upload to Supabase Storage (`product-images`), validation, and file-size checks.
- Admin Listing Approval Queue (`/admin/listings`) with Approve, Reject, Request Changes (with notes visible to seller), Edit, Pause, Unpublish, and `listing_review_logs`.

## Phase 3 — Rental Engine, Cart & Booking Hold
- Server-side centralized Pricing & Commission Engine (`src/lib/domain/pricing.ts`).
- IST (`Asia/Kolkata`) date utilities and overlap/buffer validation (`src/lib/domain/dates.ts`, `availability.ts`).
- Multi-item Cart (`/cart`) with per-item rental dates, independent pricing, fulfillment selection, and server-side availability re-validation.
- Atomic Checkout & 20-minute Reservation Hold creation (`POST /api/bookings/checkout`), generating unique Booking ID and locking inventory.
- Automatic expiration of unpaid holds (`release_expired_reservations` RPC + lazy cleanup on availability checks).

## Phase 4 — Manual UPI Payment & WhatsApp Integration
- Admin UPI & WhatsApp settings management (`/admin/settings`).
- Checkout Payment Page (`/checkout/[bookingId]`): booking summary, UPI QR code, Copy UPI ID button, payment instructions, UTR + screenshot upload (`payment-proofs` private bucket), `"I have completed payment"` action (`PAYMENT_VERIFICATION_PENDING`), and pre-filled `"Send Payment Confirmation on WhatsApp"` link.
- Admin Payment Verification Queue (`/admin/payments`): inspect UTR, amount, screenshot, and Verify / Reject / Request Proof actions with instant booking confirmation & notifications.

## Phase 5 — Customer, Seller & Admin Dashboards
- **Customer Dashboard (`/dashboard`):** Overview, Upcoming, Payment Pending, Verification Pending, Confirmed, Active Rentals (with countdown), Return Due/Pending, Completed, Cancelled, Wishlist, Security Deposit Status, Profile Settings, and Booking Detail timeline (`/dashboard/bookings/[id]`).
- **Seller Dashboard (`/seller`):** Overview metrics, Listings manager (Drafts, Pending, Published, Paused, Rejected + admin change notes), Bookings tracker, Availability/Blocked Dates manager, and immutable Earnings & Payouts ledger.
- **Admin Dashboard (`/admin`):** Platform KPIs, Listing Management, User/Seller Management (suspend/reactivate), Booking Search & Management, Payment Queue, Security Deposits & Refunds ledger, Seller Payouts (`PENDING` -> `PAID` with reference), Categories/Banners/Homepage/Policies CMS, and Platform Settings.

## Phase 6 — Rental Return Lifecycle, Disputes & Notifications
- Configurable booking state machine & transition guards across all 14 rental statuses.
- Return workflow: customer initiates return -> seller confirms receipt & records condition inspection + evidence -> deposit eligibility -> admin processes refund record -> buffer applied -> product available -> booking `COMPLETED`.
- Late-return policy tracking & documented deposit deductions.
- Dispute Management module (`/admin/disputes` + user dispute filing).
- In-app Notification center & bell dropdown with extensible notification dispatcher.

## Phase 7 — QA, Security Verification & Production Readiness
- Comprehensive Vitest suite covering pricing engine, commission snapshots, date overlap & buffer math, booking state machine transitions, and Zod input validators.
- Security audit: RLS verification, non-admin route protection, PII redaction checks, file upload limits, CSRF/rate-limit middleware.
- Full TypeScript check (`tsc --noEmit`) & Next.js production build (`npm run build`), plus UI smoke verification.
