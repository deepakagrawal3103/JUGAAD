-- ClosetLoop Migration 002: Row Level Security (RLS) & Storage Policies

-- Helper security-definer functions (avoid recursive RLS evaluation)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_seller_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.seller_profiles WHERE user_id = auth.uid();
$$;

-- Enable RLS on all application tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS & PROFILES
-- ============================================================================
CREATE POLICY users_select_own_or_admin ON public.users
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY users_update_admin_only ON public.users
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY user_profiles_select_own_or_admin ON public.user_profiles
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY user_profiles_upsert_own ON public.user_profiles
  FOR ALL USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Seller profiles: public can read limited columns via API; RLS protects private fields and writes
CREATE POLICY seller_profiles_select_approved_or_own ON public.seller_profiles
  FOR SELECT USING (verification_status = 'APPROVED' OR user_id = auth.uid() OR public.is_admin());

CREATE POLICY seller_profiles_insert_own ON public.seller_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY seller_profiles_update_own_or_admin ON public.seller_profiles
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (user_id = auth.uid() AND verification_status = (SELECT verification_status FROM public.seller_profiles WHERE user_id = auth.uid()))
  );

-- ============================================================================
-- CATEGORIES, BANNERS, HOMEPAGE SECTIONS, POLICIES, SETTINGS
-- ============================================================================
CREATE POLICY categories_public_read ON public.categories
  FOR SELECT USING (is_active = TRUE OR public.is_admin());

CREATE POLICY categories_admin_write ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY banners_public_read ON public.banners
  FOR SELECT USING (is_active = TRUE OR public.is_admin());

CREATE POLICY banners_admin_write ON public.banners
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY homepage_sections_public_read ON public.homepage_sections
  FOR SELECT USING (TRUE);

CREATE POLICY homepage_sections_admin_write ON public.homepage_sections
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY policies_public_read ON public.policies
  FOR SELECT USING (TRUE);

CREATE POLICY policies_admin_write ON public.policies
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY admin_settings_public_read ON public.admin_settings
  FOR SELECT USING (TRUE);

CREATE POLICY admin_settings_admin_write ON public.admin_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- PRODUCTS, IMAGES & AVAILABILITY
-- ============================================================================
CREATE POLICY products_select_public_or_owner_or_admin ON public.products
  FOR SELECT USING (
    (status = 'APPROVED' AND is_active = TRUE)
    OR seller_id = public.current_seller_profile_id()
    OR public.is_admin()
  );

CREATE POLICY products_insert_seller ON public.products
  FOR INSERT WITH CHECK (
    seller_id = public.current_seller_profile_id()
    AND status IN ('DRAFT', 'PENDING_REVIEW')
  );

-- Sellers cannot self-approve or reject listings
CREATE POLICY products_update_seller_or_admin ON public.products
  FOR UPDATE USING (
    seller_id = public.current_seller_profile_id() OR public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
    OR (
      seller_id = public.current_seller_profile_id()
      AND status IN ('DRAFT', 'PENDING_REVIEW', 'PAUSED', 'ARCHIVED')
    )
  );

CREATE POLICY products_delete_seller_draft_or_admin ON public.products
  FOR DELETE USING (
    public.is_admin()
    OR (seller_id = public.current_seller_profile_id() AND status IN ('DRAFT', 'REJECTED'))
  );

CREATE POLICY product_images_select ON public.product_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND ((p.status = 'APPROVED' AND p.is_active = TRUE) OR p.seller_id = public.current_seller_profile_id() OR public.is_admin())
    )
  );

CREATE POLICY product_images_write_owner_or_admin ON public.product_images
  FOR ALL USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = public.current_seller_profile_id()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = public.current_seller_profile_id()
    )
  );

CREATE POLICY product_availability_select ON public.product_availability
  FOR SELECT USING (TRUE);

CREATE POLICY product_availability_write ON public.product_availability
  FOR ALL USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = public.current_seller_profile_id())
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = public.current_seller_profile_id())
  );

CREATE POLICY blocked_dates_select_all ON public.blocked_dates
  FOR SELECT USING (TRUE);

CREATE POLICY blocked_dates_write_owner_or_admin ON public.blocked_dates
  FOR ALL USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = public.current_seller_profile_id())
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = public.current_seller_profile_id())
  );

-- ============================================================================
-- WISHLISTS & CARTS
-- ============================================================================
CREATE POLICY wishlists_own ON public.wishlists
  FOR ALL USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid());

CREATE POLICY wishlist_items_own ON public.wishlist_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.wishlists w WHERE w.id = wishlist_id AND w.user_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.wishlists w WHERE w.id = wishlist_id AND w.user_id = auth.uid())
  );

CREATE POLICY carts_own ON public.carts
  FOR ALL USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid());

CREATE POLICY cart_items_own ON public.cart_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
  );

-- ============================================================================
-- BOOKINGS, RESERVATIONS, PAYMENTS & LEDGERS
-- ============================================================================
CREATE POLICY bookings_select_customer_seller_admin ON public.bookings
  FOR SELECT USING (
    customer_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.booking_items bi
      WHERE bi.booking_id = id AND bi.seller_id = public.current_seller_profile_id()
    )
  );

CREATE POLICY bookings_admin_update ON public.bookings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY booking_items_select_parties ON public.booking_items
  FOR SELECT USING (
    public.is_admin()
    OR seller_id = public.current_seller_profile_id()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid())
  );

CREATE POLICY inventory_reservations_select_parties ON public.inventory_reservations
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = public.current_seller_profile_id())
  );

CREATE POLICY payments_select_customer_or_admin ON public.payments
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid())
  );

CREATE POLICY payment_proofs_select_customer_or_admin ON public.payment_proofs
  FOR SELECT USING (submitted_by = auth.uid() OR public.is_admin());

CREATE POLICY payment_proofs_insert_customer ON public.payment_proofs
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid())
  );

CREATE POLICY commission_records_select_seller_or_admin ON public.commission_records
  FOR SELECT USING (public.is_admin() OR seller_id = public.current_seller_profile_id());

CREATE POLICY seller_payouts_select_seller_or_admin ON public.seller_payouts
  FOR SELECT USING (public.is_admin() OR seller_id = public.current_seller_profile_id());

CREATE POLICY seller_payouts_admin_write ON public.seller_payouts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY security_deposits_select_customer_or_admin ON public.security_deposits
  FOR SELECT USING (customer_id = auth.uid() OR public.is_admin());

CREATE POLICY security_deposits_admin_write ON public.security_deposits
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY refunds_select_customer_or_admin ON public.refunds
  FOR SELECT USING (customer_id = auth.uid() OR public.is_admin());

CREATE POLICY refunds_admin_write ON public.refunds
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- INSPECTIONS, DISPUTES, NOTIFICATIONS & LOGS
-- ============================================================================
CREATE POLICY return_inspections_select_parties ON public.return_inspections
  FOR SELECT USING (
    public.is_admin()
    OR inspector_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid())
  );

CREATE POLICY return_inspections_insert_seller_or_admin ON public.return_inspections
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.booking_items bi
      WHERE bi.booking_id = booking_id AND bi.seller_id = public.current_seller_profile_id()
    )
  );

CREATE POLICY disputes_select_parties ON public.disputes
  FOR SELECT USING (
    public.is_admin()
    OR opened_by = auth.uid()
    OR against_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid())
  );

CREATE POLICY disputes_insert_parties ON public.disputes
  FOR INSERT WITH CHECK (opened_by = auth.uid());

CREATE POLICY disputes_admin_update ON public.disputes
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY notifications_own ON public.notifications
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY listing_review_logs_select_owner_or_admin ON public.listing_review_logs
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = public.current_seller_profile_id())
  );

CREATE POLICY booking_status_logs_select_parties ON public.booking_status_logs
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.booking_items bi WHERE bi.booking_id = booking_id AND bi.seller_id = public.current_seller_profile_id())
  );

CREATE POLICY audit_logs_admin_only ON public.audit_logs
  FOR SELECT USING (public.is_admin());

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================
CREATE POLICY storage_public_read_product_images ON storage.objects
  FOR SELECT USING (bucket_id IN ('product-images', 'site-assets'));

CREATE POLICY storage_seller_upload_product_images ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY storage_owner_delete_product_images ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images'
    AND (owner = auth.uid() OR public.is_admin())
  );

CREATE POLICY storage_payment_proofs_access ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs'
    AND (owner = auth.uid() OR public.is_admin())
  );

CREATE POLICY storage_payment_proofs_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY storage_return_evidence_access ON storage.objects
  FOR SELECT USING (
    bucket_id = 'return-evidence'
    AND (owner = auth.uid() OR public.is_admin())
  );

CREATE POLICY storage_return_evidence_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'return-evidence'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY storage_site_assets_admin ON storage.objects
  FOR ALL USING (bucket_id = 'site-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'site-assets' AND public.is_admin());
