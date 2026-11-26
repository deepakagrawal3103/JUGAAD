-- ClosetLoop Migration 001: Normalized PostgreSQL Schema, Triggers, Default Settings & Storage Buckets
-- All timestamps stored as TIMESTAMPTZ (UTC); UI displays in Asia/Kolkata (IST).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 1. IDENTITY & PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'SELLER', 'ADMIN')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  address_line TEXT,
  pincode TEXT,
  preferred_size TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  city TEXT NOT NULL,
  state TEXT,
  locality TEXT,
  pickup_address TEXT, -- Private: revealed only to customer after confirmed pickup booking
  payout_upi_id TEXT,
  payout_account_name TEXT,
  verification_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
  total_rentals INT NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_seller_profiles_updated_at
  BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 2. CATEGORIES & CATALOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  subcategory TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  description TEXT NOT NULL,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  gender_style TEXT NOT NULL,
  occasion TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('NEW_WITH_TAGS', 'LIKE_NEW', 'GENTLY_USED', 'VINTAGE')),
  fabric TEXT,
  original_retail_price NUMERIC(10,2) CHECK (original_retail_price IS NULL OR original_retail_price >= 0),
  daily_price NUMERIC(10,2) NOT NULL CHECK (daily_price > 0),
  security_deposit NUMERIC(10,2) NOT NULL CHECK (security_deposit >= 0),
  min_rental_days INT NOT NULL DEFAULT 1 CHECK (min_rental_days >= 1),
  max_rental_days INT NOT NULL DEFAULT 14 CHECK (max_rental_days >= min_rental_days),
  duration_pricing JSONB NOT NULL DEFAULT '[]'::JSONB,
  late_fee_per_day NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (late_fee_per_day >= 0),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  fulfillment_options JSONB NOT NULL DEFAULT '{"pickup": true, "seller_delivery": false, "platform_delivery": false, "delivery_fee": 0}'::JSONB,
  city TEXT NOT NULL,
  locality TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'PAUSED', 'ARCHIVED')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_trending BOOLEAN NOT NULL DEFAULT FALSE,
  admin_feedback TEXT,
  rental_count INT NOT NULL DEFAULT 0,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_public_lookup
  ON public.products (status, is_active, category_id, city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_seller ON public.products (seller_id, status);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products (daily_price) WHERE status = 'APPROVED' AND is_active = TRUE;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  angle_tag TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images (product_id, sort_order);

CREATE TABLE IF NOT EXISTS public.product_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  weekday_mask INT NOT NULL DEFAULT 127,
  advance_notice_days INT NOT NULL DEFAULT 1 CHECK (advance_notice_days >= 0),
  available_from DATE,
  available_until DATE,
  currently_in_use BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_product_availability_updated_at
  BEFORE UPDATE ON public.product_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_blocked_dates_product ON public.blocked_dates (product_id, start_date, end_date);

-- ============================================================================
-- 3. WISHLISTS & CARTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wishlist_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  fulfillment_type TEXT NOT NULL DEFAULT 'PICKUP' CHECK (fulfillment_type IN ('PICKUP', 'SELLER_DELIVERY', 'PLATFORM_DELIVERY')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date),
  UNIQUE (cart_id, product_id)
);

CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. BOOKINGS, INVENTORY RESERVATIONS & FINANCIALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT' CHECK (
    status IN (
      'AWAITING_PAYMENT',
      'PAYMENT_VERIFICATION_PENDING',
      'CONFIRMED',
      'READY_FOR_PICKUP',
      'DISPATCHED',
      'RENTAL_ACTIVE',
      'RETURN_DUE',
      'RETURN_INITIATED',
      'RETURNED',
      'INSPECTION_PENDING',
      'DEPOSIT_REFUND_PENDING',
      'COMPLETED',
      'CANCELLED',
      'DISPUTED'
    )
  ),
  payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (
    payment_status IN ('UNPAID', 'PAYMENT_VERIFICATION_PENDING', 'VERIFIED', 'REJECTED', 'REFUNDED')
  ),
  total_rental_amount NUMERIC(10,2) NOT NULL CHECK (total_rental_amount >= 0),
  total_commission_amount NUMERIC(10,2) NOT NULL CHECK (total_commission_amount >= 0),
  total_seller_earnings NUMERIC(10,2) NOT NULL CHECK (total_seller_earnings >= 0),
  total_security_deposit NUMERIC(10,2) NOT NULL CHECK (total_security_deposit >= 0),
  total_delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_delivery_fee >= 0),
  total_payable NUMERIC(10,2) NOT NULL CHECK (total_payable >= 0),
  commission_rate_snapshot NUMERIC(5,2) NOT NULL,
  cleaning_buffer_days_snapshot INT NOT NULL DEFAULT 1,
  payment_expires_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  delivery_address JSONB,
  customer_notes TEXT,
  admin_internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status, payment_status, payment_expires_at);

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE RESTRICT,
  product_title_snapshot TEXT NOT NULL,
  product_image_snapshot TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  buffer_end_date DATE NOT NULL,
  rental_days INT NOT NULL CHECK (rental_days >= 1),
  daily_rate_snapshot NUMERIC(10,2) NOT NULL,
  rental_amount NUMERIC(10,2) NOT NULL,
  commission_percent_snapshot NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  seller_earnings NUMERIC(10,2) NOT NULL,
  security_deposit NUMERIC(10,2) NOT NULL,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('PICKUP', 'SELLER_DELIVERY', 'PLATFORM_DELIVERY')),
  return_deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date),
  CHECK (buffer_end_date >= end_date)
);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON public.booking_items (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_seller ON public.booking_items (seller_id, start_date DESC);

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_item_id UUID NOT NULL REFERENCES public.booking_items(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL, -- Inclusive of cleaning buffer days
  status TEXT NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'CONFIRMED', 'RELEASED', 'EXPIRED')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_inventory_res_lookup
  ON public.inventory_reservations (product_id, status, start_date, end_date);

CREATE TRIGGER trg_inventory_reservations_updated_at
  BEFORE UPDATE ON public.inventory_reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  expected_amount NUMERIC(10,2) NOT NULL CHECK (expected_amount >= 0),
  submitted_amount NUMERIC(10,2),
  payment_method TEXT NOT NULL DEFAULT 'MANUAL_UPI',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFICATION_PENDING', 'VERIFIED', 'REJECTED', 'REFUNDED')),
  verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  utr_reference TEXT NOT NULL,
  paid_amount NUMERIC(10,2) NOT NULL CHECK (paid_amount > 0),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  screenshot_path TEXT,
  notes TEXT,
  review_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'MORE_PROOF_REQUESTED')),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_booking ON public.payment_proofs (booking_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.commission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_item_id UUID NOT NULL UNIQUE REFERENCES public.booking_items(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE RESTRICT,
  gross_rental_amount NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  seller_net_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE RESTRICT,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_item_id UUID NOT NULL UNIQUE REFERENCES public.booking_items(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED')),
  payout_reference TEXT,
  paid_at TIMESTAMPTZ,
  processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_seller_payouts_updated_at
  BEFORE UPDATE ON public.seller_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.security_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  amount_expected NUMERIC(10,2) NOT NULL CHECK (amount_expected >= 0),
  amount_held NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_held >= 0),
  deduction_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deduction_amount >= 0),
  deduction_reason TEXT,
  refund_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT'
    CHECK (status IN ('PENDING_PAYMENT', 'HELD', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FORFEITED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_security_deposits_updated_at
  BEFORE UPDATE ON public.security_deposits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_deposit_id UUID NOT NULL REFERENCES public.security_deposits(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  refund_reference TEXT,
  method TEXT NOT NULL DEFAULT 'UPI',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
  processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. RETURNS, DISPUTES, NOTIFICATIONS & GOVERNANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.return_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_item_id UUID REFERENCES public.booking_items(id) ON DELETE CASCADE,
  inspector_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  inspector_role TEXT NOT NULL CHECK (inspector_role IN ('SELLER', 'ADMIN')),
  condition_status TEXT NOT NULL CHECK (condition_status IN ('GOOD', 'MINOR_WEAR', 'DAMAGED', 'MISSING_ITEMS', 'LATE')),
  damage_found BOOLEAN NOT NULL DEFAULT FALSE,
  deduction_recommended NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deduction_recommended >= 0),
  evidence_paths JSONB NOT NULL DEFAULT '[]'::JSONB,
  notes TEXT,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  against_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  dispute_type TEXT NOT NULL CHECK (
    dispute_type IN ('DAMAGED_PRODUCT', 'MISSING_PRODUCT', 'LATE_RETURN', 'INCORRECT_PRODUCT', 'REFUND_DISPUTE', 'PAYMENT_DISPUTE')
  ),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED')),
  description TEXT NOT NULL,
  evidence_paths JSONB NOT NULL DEFAULT '[]'::JSONB,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand_name TEXT NOT NULL DEFAULT 'ClosetLoop',
  brand_tagline TEXT NOT NULL DEFAULT 'Your next look doesn''t have to be yours.',
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 30.00 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  reservation_hold_minutes INT NOT NULL DEFAULT 20 CHECK (reservation_hold_minutes >= 5 AND reservation_hold_minutes <= 1440),
  cleaning_buffer_days INT NOT NULL DEFAULT 1 CHECK (cleaning_buffer_days >= 0 AND cleaning_buffer_days <= 14),
  late_fee_grace_hours INT NOT NULL DEFAULT 4 CHECK (late_fee_grace_hours >= 0),
  late_fee_policy_summary TEXT NOT NULL DEFAULT 'Returns beyond the grace window incur the listing''s daily late fee, subject to documented inspection and admin verification.',
  upi_id TEXT NOT NULL DEFAULT '',
  upi_display_name TEXT NOT NULL DEFAULT 'ClosetLoop Rentals',
  upi_qr_url TEXT NOT NULL DEFAULT '',
  whatsapp_number TEXT NOT NULL DEFAULT '',
  payment_instructions TEXT NOT NULL DEFAULT 'Scan the QR code or copy the UPI ID above to pay the exact total. Submit your 12-digit UTR / transaction reference and payment screenshot below, then send confirmation on WhatsApp for faster verification.',
  allowed_booking_transitions JSONB NOT NULL DEFAULT '{
    "AWAITING_PAYMENT": ["PAYMENT_VERIFICATION_PENDING", "CANCELLED"],
    "PAYMENT_VERIFICATION_PENDING": ["CONFIRMED", "AWAITING_PAYMENT", "CANCELLED", "DISPUTED"],
    "CONFIRMED": ["READY_FOR_PICKUP", "DISPATCHED", "CANCELLED", "DISPUTED"],
    "READY_FOR_PICKUP": ["RENTAL_ACTIVE", "DISPATCHED", "CANCELLED", "DISPUTED"],
    "DISPATCHED": ["RENTAL_ACTIVE", "DISPUTED"],
    "RENTAL_ACTIVE": ["RETURN_DUE", "RETURN_INITIATED", "DISPUTED"],
    "RETURN_DUE": ["RETURN_INITIATED", "RETURNED", "DISPUTED"],
    "RETURN_INITIATED": ["RETURNED", "DISPUTED"],
    "RETURNED": ["INSPECTION_PENDING", "DISPUTED"],
    "INSPECTION_PENDING": ["DEPOSIT_REFUND_PENDING", "DISPUTED"],
    "DEPOSIT_REFUND_PENDING": ["COMPLETED", "DISPUTED"],
    "DISPUTED": ["DEPOSIT_REFUND_PENDING", "COMPLETED", "CANCELLED"]
  }'::JSONB,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_label TEXT,
  cta_href TEXT,
  image_url TEXT,
  placement TEXT NOT NULL DEFAULT 'HERO' CHECK (placement IN ('HERO', 'PROMO', 'SELLER_BANNER')),
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  requires_legal_review BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.listing_review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'EDITED', 'PAUSED', 'UNPUBLISHED')),
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.booking_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. AUTH USER PROVISIONING TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, status)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'CUSTOMER', 'ACTIVE')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, 'Member'), '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wishlists (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.carts (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================================
-- 7. DEFAULT CATEGORIES & EDITABLE DRAFT POLICIES
-- ============================================================================

INSERT INTO public.categories (name, slug, display_order) VALUES
  ('Dresses', 'dresses', 1),
  ('Ethnic Wear', 'ethnic-wear', 2),
  ('Sarees', 'sarees', 3),
  ('Lehenga', 'lehenga', 4),
  ('Shirts', 'shirts', 5),
  ('T-Shirts', 't-shirts', 6),
  ('Pants', 'pants', 7),
  ('Trousers', 'trousers', 8),
  ('Jeans', 'jeans', 9),
  ('Jackets', 'jackets', 10),
  ('Blazers', 'blazers', 11),
  ('Shoes', 'shoes', 12),
  ('Sneakers', 'sneakers', 13),
  ('Accessories', 'accessories', 14)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.homepage_sections (section_key, title, subtitle, display_order) VALUES
  ('featured', 'Curated Highlights', 'Editor-approved statement pieces ready for your calendar.', 1),
  ('trending', 'Trending Now', 'Most booked silhouettes across weddings, galas, and weekend escapes.', 2),
  ('categories', 'Shop by Category', 'Explore silhouettes from heritage ethnic wear to modern tailoring.', 3),
  ('occasions', 'Shop by Occasion', 'Dressed for every invitation.', 4),
  ('recent', 'Recently Added', 'Fresh arrivals approved into the marketplace.', 5)
ON CONFLICT (section_key) DO NOTHING;

INSERT INTO public.policies (slug, title, content_markdown, requires_legal_review) VALUES
  ('rental-policy', 'Rental Policy', E'# Rental Policy (Draft)\n\n> **Notice:** Editable operational policy draft. Requires business and legal counsel review prior to commercial launch.\n\n1. Rentals are booked for inclusive calendar dates in IST (`Asia/Kolkata`).\n2. Listings are owned by independent peer sellers and reviewed by the platform prior to publication.\n3. Items must be returned on or before the return deadline in clean, wear-ready condition without unauthorized alterations.', TRUE),
  ('cancellation-policy', 'Cancellation Policy', E'# Cancellation Policy (Draft)\n\n> **Notice:** Editable operational policy draft. Requires legal review prior to launch.\n\n- Unpaid reservations automatically expire after the configured hold window.\n- Confirmed bookings cancelled more than 72 hours before the rental start date may qualify for rental credit or refund subject to admin review.', TRUE),
  ('refund-policy', 'Refund Policy', E'# Refund Policy (Draft)\n\n> **Notice:** Editable operational policy draft. Requires legal review prior to launch.\n\nApproved security deposit refunds and eligible booking refunds are processed back via UPI after return inspection and admin verification.', TRUE),
  ('security-deposit-policy', 'Security Deposit Policy', E'# Security Deposit Policy (Draft)\n\n> **Notice:** Editable operational policy draft. Requires legal review prior to launch.\n\n1. A refundable security deposit is collected separately from rental charges.\n2. Platform commission is never deducted from security deposits.\n3. Deposits are released after seller/admin return inspection confirms no undocumented damage or missing accessories.', TRUE),
  ('late-return-policy', 'Late Return Policy', E'# Late Return Policy (Draft)\n\n> **Notice:** Editable operational policy draft. Requires legal review prior to launch.\n\nLate returns impact subsequent customer bookings. After the grace window, applicable daily late fees may be recorded against the security deposit only with documented admin review.', TRUE),
  ('damage-policy', 'Damage Policy', E'# Damage Policy (Draft)\n\n> **Notice:** Editable operational policy draft. Requires legal review prior to launch.\n\nNormal wear from careful use is expected. Repairable damage, permanent stains, or missing components are documented during return inspection before any deposit deduction is approved.', TRUE),
  ('privacy-policy', 'Privacy Policy', E'# Privacy Policy (Draft)\n\n> **Notice:** Editable draft policy. Requires legal review prior to launch.\n\nWe collect only account, delivery, and verification records needed to operate bookings securely. Sellers'' private contact details are never exposed on public product pages.', TRUE),
  ('terms-and-conditions', 'Terms & Conditions', E'# Terms & Conditions (Draft)\n\n> **Notice:** Editable draft policy. Requires legal review prior to launch.\n\nBy registering or booking on ClosetLoop, users agree to provide accurate identity, payment UTR, and garment condition records.', TRUE),
  ('seller-agreement', 'Seller Agreement', E'# Seller Agreement (Draft)\n\n> **Notice:** Editable draft policy. Requires legal review prior to launch.\n\nSellers retain ownership of listed garments. Platform commission applies solely to rental charges at the active rate recorded at booking creation. Listings require admin approval before publication.', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 8. STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('payment-proofs', 'payment-proofs', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('return-evidence', 'return-evidence', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('site-assets', 'site-assets', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
