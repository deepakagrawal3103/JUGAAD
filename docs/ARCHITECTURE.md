# ClosetLoop — Technical Architecture & System Design

> **Brand Configuration:** All brand strings (`ClosetLoop`, tagline `"Your next look doesn't have to be yours."`, currency `INR` / `₹`, timezone `Asia/Kolkata`) live in a single central config module (`src/config/brand.ts`) and can be overridden via environment variables or admin settings without refactoring application code.

---

## 1. High-Level System Architecture

ClosetLoop is a **peer-to-peer fashion rental marketplace** built on **Next.js App Router (TypeScript)** backed by **Supabase (PostgreSQL + Auth + Storage + Row Level Security)**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Next.js App)                          │
│  Public Storefront │ Customer Dashboard │ Seller Studio │ Admin Console │
│  Tailwind CSS + shadcn/ui Editorial Components (SSR + Client Islands)   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS / Server Actions / REST Route Handlers
┌───────────────────────────────▼─────────────────────────────────────────┐
│                      NEXT.JS SERVER LAYER (Trusted)                     │
│  • Auth Session & Role Guards (Customer / Seller / Admin)               │
│  • Input Validation (Zod) & Rate Limiting                               │
│  • Centralized Pricing & Commission Engine (Server-side only)           │
│  • Availability & Atomic Reservation Service (Calls Postgres RPCs)      │
│  • State Machine Validators (Listing Approval, Booking & Return Flow)   │
│  • Audit & Notification Dispatchers                                     │
└───────────┬───────────────────────────────────────┬─────────────────────┘
            │                                       │
┌───────────▼──────────────┐             ┌──────────▼─────────────────────┐
│   SUPABASE POSTGRESQL    │             │       SUPABASE STORAGE         │
│  • 27 Normalized Tables  │             │  • product-images (Public)     │
│  • Row Level Security    │             │  • payment-proofs (Private)    │
│  • Atomic Booking RPCs   │             │  • return-evidence (Private)   │
│  • Exclusion/Hold Logic  │             │  • site-assets (Public QR/Hero)│
└──────────────────────────┘             └────────────────────────────────┘
```

### Core Architectural Principles
1. **Zero Trust on Client Inputs:** Prices, commission rates, seller earnings, security deposits, availability checks, booking totals, payment statuses, and user roles are **never** trusted from the frontend. All financial snapshots and availability locks are computed and persisted server-side inside PostgreSQL transactions.
2. **Separation of Concerns:**
   - `src/config/`: Brand identity, constants, policy defaults.
   - `src/lib/domain/`: Pure TypeScript business logic (pricing engine, availability math, booking/listing state machines, WhatsApp deep-link builder, IST date utilities).
   - `src/lib/supabase/`: Typed browser, server-cookie, and service-role Supabase clients.
   - `src/lib/auth/`: Session helpers, role verification guards, rate limiter.
   - `src/lib/validators/`: Zod schemas for all API endpoints and server actions.
   - `src/app/api/`: REST API route handlers for programmatic, transactional, and upload operations.
   - `src/components/`: Reusable editorial UI primitives (`ui/`), storefront modules, wizard steps, and role-specific dashboard panels.
3. **Immutable Financial Snapshots:** Every `booking_items` and `commission_records` row freezes `commission_percent_snapshot`, `daily_rate_snapshot`, `rental_amount`, `commission_amount`, `seller_earnings`, and `security_deposit` at checkout time so future admin commission changes never alter historical payouts.
4. **Timezone Discipline:** All timestamps are stored as `TIMESTAMPTZ` (UTC) in PostgreSQL and consistently formatted/resolved in `Asia/Kolkata` (IST) via `src/lib/domain/dates.ts` for rental day calculations, buffer windows, hold countdowns, and return deadlines.

---

## 2. User Roles & Permission Matrix

| Capability | Guest | Customer | Seller | Admin |
| :--- | :---: | :---: | :---: | :---: |
| Browse & search `APPROVED` active listings | ✅ | ✅ | ✅ | ✅ |
| View unapproved / `DRAFT` / `PENDING_REVIEW` / `REJECTED` listings | ❌ | ❌ | Own only | ✅ All |
| Register / login / manage own profile | ❌ | ✅ | ✅ | ✅ |
| Wishlist & Cart management | ❌ | ✅ | ✅ | ✅ |
| Checkout & submit UPI payment proof | ❌ | ✅ | ✅ (other items) | ✅ |
| View own bookings & deposit status | ❌ | ✅ | ✅ | ✅ All |
| Apply to become a seller | ❌ | ✅ | ✅ | ✅ |
| Create/edit drafts, submit listings, upload images | ❌ | ❌ | ✅ Own | ✅ All |
| Approve/reject/request changes/unpublish listings | ❌ | ❌ | ❌ | ✅ |
| View seller bookings, returns & earnings | ❌ | ❌ | ✅ Own | ✅ All |
| Verify/reject UPI payments & confirm bookings | ❌ | ❌ | ❌ | ✅ |
| Manage deposits, refunds, payouts, disputes | ❌ | ❌ | ❌ | ✅ |
| Manage categories, banners, policies, settings | ❌ | ❌ | ❌ | ✅ |

> **Self-Rental Prevention:** A seller cannot rent their own listing (`product.seller_id !== customer_id` enforced on the backend).
> **Approval Integrity:** Sellers can only transition a listing to `DRAFT`, `PENDING_REVIEW`, `PAUSED` (when `APPROVED`), or `ARCHIVED`. Only Admins can transition to `APPROVED`, `REJECTED`, or `CHANGES_REQUESTED`.

---

## 3. Booking, Reservation Hold & Inventory Engine

### Inventory & Buffer Rules
- Each listing defaults to `quantity = 1` physical garment unless explicitly configured higher by the seller.
- A date range `[start_date, end_date]` (inclusive) occupies inventory for:
  - `[start_date, end_date + cleaning_buffer_days]`
  - Default `cleaning_buffer_days = 1` (configurable in `admin_settings`).
- **Blocking Sources:**
  1. Seller `blocked_dates` (manual unavailability, item in personal use, maintenance).
  2. Active `inventory_reservations` where `expires_at > now()` and status is `HELD`.
  3. Confirmed/Active `bookings` in states: `CONFIRMED`, `READY_FOR_PICKUP`, `DISPATCHED`, `RENTAL_ACTIVE`, `RETURN_DUE`, `RETURN_INITIATED`, `RETURNED`, `INSPECTION_PENDING`, `DEPOSIT_REFUND_PENDING`, `DISPUTED`.

### Atomic Reservation Flow (PostgreSQL RPC `create_booking_from_cart`)
1. Authenticate customer and validate non-empty cart.
2. Acquire row-level `FOR UPDATE` lock on each involved `products` row in deterministic UUID order (prevents deadlocks).
3. Verify every product has `status = 'APPROVED'`, `is_active = true`, and `seller_id != customer_id`.
4. Release any expired `HELD` reservations (`expires_at <= now()`) and transition stale `AWAITING_PAYMENT` bookings to `EXPIRED`/`CANCELLED`.
5. For each cart item, verify requested `duration_days` falls within `[min_rental_days, max_rental_days]` and count overlapping blocked/held/booked units against `products.quantity`. Abort transaction with `409 Conflict` if any date overlaps.
6. Read active `commission_percent`, `reservation_hold_minutes` (default 20), and `cleaning_buffer_days` (default 1) from `admin_settings`.
7. Compute rental price, platform commission (on rental only), seller earnings, security deposit, and delivery fee on the server.
8. Insert `bookings` (`AWAITING_PAYMENT`, `payment_expires_at = now() + hold_minutes`), `booking_items`, `inventory_reservations` (`HELD`), `payments` (`PENDING`), `security_deposits` (`HELD_PENDING_PAYMENT`), `commission_records`, and `booking_status_logs`.
9. Clear the customer's `cart_items` and return the unique `booking_reference` (e.g., `CL-20261126-4821`).

---

## 4. Booking & Return Lifecycle State Machine

```
AWAITING_PAYMENT ──(hold expires / user cancels)──▶ CANCELLED
        │
  (customer submits UTR/proof)
        ▼
PAYMENT_VERIFICATION_PENDING ──(admin rejects)──▶ AWAITING_PAYMENT (resubmit) / CANCELLED
        │
  (admin verifies payment)
        ▼
CONFIRMED ──▶ READY_FOR_PICKUP ──▶ DISPATCHED ──▶ RENTAL_ACTIVE ──▶ RETURN_DUE
                                                                        │
                                                  (customer initiates)  ▼
COMPLETED ◀── DEPOSIT_REFUND_PENDING ◀── INSPECTION_PENDING ◀── RETURNED ◀── RETURN_INITIATED
                                                  │
                                          (issue found)
                                                  ▼
                                               DISPUTED
```

Admin settings allow configuring allowed transitions, while server-side validation prevents skipping critical financial/inspection gates.

---

## 5. Pricing & Commission Formulas

For each booking line item:
- `rental_days = (end_date - start_date) + 1` (inclusive calendar days)
- `rental_amount = round2(daily_price * rental_days)` *(with optional multi-day tier discounts if seller configured them)*
- `platform_commission = round2(rental_amount * (commission_percent / 100))`
- `seller_earnings = round2(rental_amount - platform_commission)`
- `security_deposit = round2(product.security_deposit)` *(0% commission deducted)*
- `delivery_fee = fulfillment_type === 'SELLER_DELIVERY' ? round2(product.delivery_fee) : 0`
- `item_customer_payable = rental_amount + security_deposit + delivery_fee`

Booking totals aggregate across all `booking_items` in the checkout session.

---

## 6. Manual UPI Payment & WhatsApp Verification Workflow

1. Customer reaches `/checkout/[bookingId]` or `/dashboard/bookings/[id]`.
2. Page renders `admin_settings` UPI configuration: QR code image, UPI ID (with one-click copy), UPI display name, payment instructions, and exact payable breakdown.
3. Customer pays via any UPI app and submits the **UTR / Transaction Reference**, **Paid Amount**, **Payment Timestamp**, and optional **Payment Screenshot** (uploaded to private `payment-proofs` bucket).
4. Submission transitions `bookings.status` -> `PAYMENT_VERIFICATION_PENDING` and `payments.status` -> `VERIFICATION_PENDING`. **Never auto-confirms.**
5. Customer can also click **"Send Payment Confirmation on WhatsApp"**, opening `https://wa.me/<configured_number>?text=<encoded_template>` with Booking ID, Customer Name, Amount Paid, and UTR pre-filled.
6. Admin reviews the **Payment Verification Queue** (`/admin/payments`):
   - **Verify:** Marks payment `VERIFIED`, confirms booking (`CONFIRMED`), converts `inventory_reservations` from `HELD` to `CONFIRMED`, activates `security_deposits` (`HELD`), creates `seller_payouts` (`PENDING`), notifies customer & seller, logs audit entry.
   - **Reject:** Marks proof `REJECTED` with reason, notifies customer, allows proof resubmission if within window (or admin can cancel and release inventory).
