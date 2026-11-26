# ClosetLoop — PostgreSQL & Supabase Database Schema

All migrations live in `supabase/migrations/` and are designed to run cleanly on Supabase PostgreSQL 15+.

## 1. Core Entity Relationship Overview

- **Identity & Roles:** `users` (mirroring `auth.users`), `user_profiles`, `seller_profiles`
- **Catalog:** `categories`, `products`, `product_images`, `product_availability`, `blocked_dates`
- **Discovery & Intent:** `wishlists`, `wishlist_items`, `carts`, `cart_items`
- **Transactions & Inventory:** `bookings`, `booking_items`, `inventory_reservations`
- **Payments & Financials:** `payments`, `payment_proofs`, `commission_records`, `seller_payouts`, `security_deposits`, `refunds`
- **Fulfillment & Trust:** `return_inspections`, `disputes`, `notifications`
- **Governance & CMS:** `admin_settings`, `homepage_sections`, `banners`, `policies`, `listing_review_logs`, `booking_status_logs`, `audit_logs`

---

## 2. Table Specifications

### Identity & Profiles
1. **`users`**
   - `id UUID PK` (references `auth.users(id)` on delete cascade)
   - `email TEXT UNIQUE NOT NULL`
   - `role TEXT CHECK (role IN ('CUSTOMER','SELLER','ADMIN')) NOT NULL DEFAULT 'CUSTOMER'`
   - `status TEXT CHECK (status IN ('ACTIVE','SUSPENDED')) NOT NULL DEFAULT 'ACTIVE'`
   - `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
2. **`user_profiles`**
   - `user_id UUID PK FK -> users(id)`
   - `full_name TEXT NOT NULL`, `phone TEXT`, `avatar_url TEXT`
   - `city TEXT`, `state TEXT`, `address_line TEXT`, `pincode TEXT`
   - `preferred_size TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
3. **`seller_profiles`**
   - `id UUID PK DEFAULT gen_random_uuid()`
   - `user_id UUID UNIQUE FK -> users(id)`
   - `display_name TEXT NOT NULL` *(public-facing closet/boutique name)*
   - `bio TEXT`, `city TEXT NOT NULL`, `state TEXT`, `locality TEXT`
   - `pickup_address TEXT` *(private, shared only on confirmed pickup bookings)*
   - `payout_upi_id TEXT`, `payout_account_name TEXT`
   - `verification_status TEXT CHECK (verification_status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')) DEFAULT 'PENDING'`
   - `total_rentals INT DEFAULT 0`, `rating_avg NUMERIC(3,2) DEFAULT 0`
   - `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`

### Catalog & Availability
4. **`categories`**
   - `id UUID PK`, `name TEXT NOT NULL`, `slug TEXT UNIQUE NOT NULL`, `parent_id UUID FK -> categories(id)`
   - `description TEXT`, `image_url TEXT`, `display_order INT DEFAULT 0`, `is_active BOOLEAN DEFAULT true`
5. **`products`**
   - `id UUID PK`, `seller_id UUID FK -> seller_profiles(id)`
   - `category_id UUID FK -> categories(id)`, `subcategory TEXT`
   - `title TEXT NOT NULL`, `slug TEXT UNIQUE NOT NULL`, `brand TEXT NOT NULL`, `description TEXT NOT NULL`
   - `size TEXT NOT NULL`, `color TEXT NOT NULL`, `gender_style TEXT NOT NULL`, `occasion TEXT NOT NULL`
   - `condition TEXT CHECK (condition IN ('NEW_WITH_TAGS','LIKE_NEW','GENTLY_USED','VINTAGE')) NOT NULL`
   - `fabric TEXT`, `original_retail_price NUMERIC(10,2)`
   - `daily_price NUMERIC(10,2) NOT NULL CHECK (daily_price > 0)`
   - `security_deposit NUMERIC(10,2) NOT NULL CHECK (security_deposit >= 0)`
   - `min_rental_days INT NOT NULL DEFAULT 1`, `max_rental_days INT NOT NULL DEFAULT 14`
   - `duration_pricing JSONB DEFAULT '[]'` *(optional multi-day bundle rates)*
   - `late_fee_per_day NUMERIC(10,2) DEFAULT 0`
   - `quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1)`
   - `fulfillment_options JSONB` (`pickup`, `seller_delivery`, `platform_delivery`, `delivery_fee`)
   - `city TEXT NOT NULL`, `locality TEXT`
   - `status TEXT CHECK (status IN ('DRAFT','PENDING_REVIEW','CHANGES_REQUESTED','APPROVED','REJECTED','PAUSED','ARCHIVED')) NOT NULL DEFAULT 'DRAFT'`
   - `is_active BOOLEAN DEFAULT true`, `is_featured BOOLEAN DEFAULT false`, `is_trending BOOLEAN DEFAULT false`
   - `admin_feedback TEXT`, `rental_count INT DEFAULT 0`, `view_count INT DEFAULT 0`
   - `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
6. **`product_images`**
   - `id UUID PK`, `product_id UUID FK -> products(id) ON DELETE CASCADE`
   - `storage_path TEXT NOT NULL`, `public_url TEXT NOT NULL`, `angle_tag TEXT`, `sort_order INT DEFAULT 0`, `is_primary BOOLEAN DEFAULT false`
7. **`product_availability`**
   - `id UUID PK`, `product_id UUID FK -> products(id) ON DELETE CASCADE`
   - `weekday_mask INT DEFAULT 127`, `advance_notice_days INT DEFAULT 1`, `available_from DATE`, `available_until DATE`
8. **`blocked_dates`**
   - `id UUID PK`, `product_id UUID FK -> products(id) ON DELETE CASCADE`
   - `start_date DATE NOT NULL`, `end_date DATE NOT NULL`, `reason TEXT`, `created_by UUID FK -> users(id)`
   - Constraint: `CHECK (end_date >= start_date)`

### Wishlist & Cart
9. **`wishlists`** (`id`, `user_id UNIQUE FK`) & **`wishlist_items`** (`id`, `wishlist_id FK`, `product_id FK`, `UNIQUE(wishlist_id, product_id)`)
10. **`carts`** (`id`, `user_id UNIQUE FK`) & **`cart_items`** (`id`, `cart_id FK`, `product_id FK`, `start_date DATE`, `end_date DATE`, `fulfillment_type TEXT`, `UNIQUE(cart_id, product_id)`)

### Bookings, Reservations & Financials
11. **`bookings`**
    - `id UUID PK`, `booking_reference TEXT UNIQUE NOT NULL`
    - `customer_id UUID FK -> users(id)`
    - `status TEXT NOT NULL` (14 lifecycle statuses + `EXPIRED`)
    - `payment_status TEXT NOT NULL` (`UNPAID`, `PAYMENT_VERIFICATION_PENDING`, `VERIFIED`, `REJECTED`, `REFUNDED`)
    - `total_rental_amount NUMERIC(10,2)`, `total_commission_amount NUMERIC(10,2)`, `total_seller_earnings NUMERIC(10,2)`
    - `total_security_deposit NUMERIC(10,2)`, `total_delivery_fee NUMERIC(10,2)`, `total_payable NUMERIC(10,2)`
    - `commission_rate_snapshot NUMERIC(5,2)`, `cleaning_buffer_days_snapshot INT`
    - `payment_expires_at TIMESTAMPTZ`, `confirmed_at TIMESTAMPTZ`, `cancelled_at TIMESTAMPTZ`, `cancellation_reason TEXT`
    - `delivery_address JSONB`, `customer_notes TEXT`, `admin_internal_notes TEXT`
12. **`booking_items`**
    - `id UUID PK`, `booking_id UUID FK -> bookings(id) ON DELETE CASCADE`, `product_id UUID FK -> products(id)`, `seller_id UUID FK -> seller_profiles(id)`
    - `product_title_snapshot TEXT`, `product_image_snapshot TEXT`
    - `start_date DATE NOT NULL`, `end_date DATE NOT NULL`, `buffer_end_date DATE NOT NULL`, `rental_days INT NOT NULL`
    - `daily_rate_snapshot NUMERIC(10,2)`, `rental_amount NUMERIC(10,2)`, `commission_percent_snapshot NUMERIC(5,2)`
    - `commission_amount NUMERIC(10,2)`, `seller_earnings NUMERIC(10,2)`, `security_deposit NUMERIC(10,2)`, `delivery_fee NUMERIC(10,2)`
    - `fulfillment_type TEXT NOT NULL`, `return_deadline TIMESTAMPTZ`
13. **`inventory_reservations`**
    - `id UUID PK`, `product_id UUID FK -> products(id)`, `booking_id UUID FK -> bookings(id) ON DELETE CASCADE`, `booking_item_id UUID FK -> booking_items(id) ON DELETE CASCADE`
    - `start_date DATE NOT NULL`, `end_date DATE NOT NULL` *(includes buffer days)*
    - `status TEXT CHECK (status IN ('HELD','CONFIRMED','RELEASED','EXPIRED')) NOT NULL`
    - `expires_at TIMESTAMPTZ`
14. **`payments`** (`id`, `booking_id UNIQUE FK`, `expected_amount`, `submitted_amount`, `payment_method`, `status`, `verified_by FK`, `verified_at`, `rejection_reason`)
15. **`payment_proofs`** (`id`, `payment_id FK`, `booking_id FK`, `submitted_by FK`, `utr_reference TEXT`, `paid_amount NUMERIC(10,2)`, `paid_at TIMESTAMPTZ`, `screenshot_path TEXT`, `notes TEXT`, `review_status TEXT`, `reviewed_by FK`, `review_note TEXT`)
16. **`commission_records`** (`id`, `booking_id FK`, `booking_item_id UNIQUE FK`, `seller_id FK`, `gross_rental_amount`, `commission_rate`, `commission_amount`, `seller_net_amount`, `created_at`)
17. **`seller_payouts`** (`id`, `seller_id FK`, `booking_id FK`, `booking_item_id FK`, `amount`, `status` (`PENDING`,`APPROVED`,`PROCESSING`,`PAID`,`FAILED`), `payout_reference`, `paid_at`, `processed_by FK`, `notes`)
18. **`security_deposits`** (`id`, `booking_id UNIQUE FK`, `customer_id FK`, `amount_expected`, `amount_held`, `deduction_amount`, `deduction_reason`, `refund_amount`, `status` (`PENDING_PAYMENT`,`HELD`,`REFUND_PENDING`,`PARTIALLY_REFUNDED`,`REFUNDED`,`FORFEITED`))
19. **`refunds`** (`id`, `security_deposit_id FK`, `booking_id FK`, `customer_id FK`, `amount`, `refund_reference`, `method`, `status`, `processed_by FK`, `processed_at`, `notes`)

### Returns, Disputes, Notifications & Governance
20. **`return_inspections`** (`id`, `booking_id FK`, `booking_item_id FK`, `inspector_id FK`, `inspector_role`, `condition_status`, `damage_found BOOLEAN`, `deduction_recommended NUMERIC(10,2)`, `evidence_paths JSONB`, `notes TEXT`, `inspected_at`)
21. **`disputes`** (`id`, `booking_id FK`, `opened_by FK`, `against_user_id FK`, `dispute_type`, `status`, `description`, `evidence_paths JSONB`, `resolution_notes`, `resolved_by FK`, `resolved_at`)
22. **`notifications`** (`id`, `user_id FK`, `type TEXT`, `title TEXT`, `body TEXT`, `link TEXT`, `metadata JSONB`, `is_read BOOLEAN DEFAULT false`, `created_at`)
23. **`admin_settings`** (`id INT PK DEFAULT 1 CHECK (id = 1)`, `brand_name`, `brand_tagline`, `commission_percent`, `reservation_hold_minutes`, `cleaning_buffer_days`, `late_fee_grace_hours`, `upi_id`, `upi_display_name`, `upi_qr_url`, `whatsapp_number`, `payment_instructions`, `allowed_booking_transitions JSONB`, `updated_by`, `updated_at`)
24. **`banners`** & **`homepage_sections`** & **`policies`** (editable CMS & legal policy drafts with `requires_legal_review` flag)
25. **`listing_review_logs`**, **`booking_status_logs`**, **`audit_logs`** (immutable audit trail).

---

## 3. Row Level Security (RLS) Strategy

- Helper SQL functions `public.current_user_role()` and `public.is_admin()` (`SECURITY DEFINER STABLE`) prevent recursive RLS queries.
- **Public Read:** Only `categories`, `banners`, `policies`, `homepage_sections`, and `products` / `product_images` where `status = 'APPROVED' AND is_active = true`.
- **Private Customer Data:** `carts`, `wishlists`, `bookings`, `payments`, `payment_proofs`, `security_deposits`, `refunds`, `notifications` restricted to `auth.uid() = customer_id / user_id` or `is_admin()`.
- **Seller Data:** `products` (all statuses), `booking_items` (for their listings), `commission_records`, `seller_payouts` visible to owning seller (`seller_profiles.user_id = auth.uid()`) or admin.
- **Strict Write Guards:** Payment verification, commission creation, booking status confirmation, and listing approvals are restricted to Admin / `SECURITY DEFINER` server RPCs.
