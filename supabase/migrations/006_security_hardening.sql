-- Tighten database privileges before the public launch.
-- The API uses the service-role key only on the server for the three
-- transactional/administrative RPCs below. Public catalog RPCs remain readable.

REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Seller row RLS controls which profile is visible; column grants additionally
-- prevent public/authenticated clients from reading pickup and payout details.
REVOKE SELECT ON TABLE public.seller_profiles FROM anon, authenticated;
GRANT SELECT (
  id,
  display_name,
  bio,
  city,
  state,
  locality,
  verification_status,
  total_rentals,
  rating_avg,
  created_at,
  updated_at
) ON TABLE public.seller_profiles TO anon, authenticated;

-- The browser no longer needs seller_profiles.user_id to discover its own
-- seller profile; it calls current_seller_profile_id() instead.

-- Security-definer RPCs must never be callable directly by public browser roles.
REVOKE ALL ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;

REVOKE ALL ON FUNCTION public.create_booking_from_cart(UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_from_cart(UUID, JSONB, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.admin_verify_payment(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_payment(UUID, UUID, TEXT, TEXT) TO service_role;

-- These SECURITY DEFINER functions only resolve trusted objects from public;
-- pg_temp is deliberately placed after public to prevent object shadowing.
ALTER FUNCTION public.handle_new_auth_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.current_user_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.current_seller_profile_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.release_expired_reservations() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_product_availability(UUID, DATE, DATE) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_product_unavailable_dates(UUID, DATE, DATE) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_booking_from_cart(UUID, JSONB, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_verify_payment(UUID, UUID, TEXT, TEXT) SET search_path = public, pg_temp;

-- These two SECURITY DEFINER functions are public read endpoints. They must
-- not trigger the write-capable expiry cleanup RPC during a catalog lookup.
CREATE OR REPLACE FUNCTION public.check_product_availability(
  p_product_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product RECORD;
  v_buffer_days INT;
  v_buffer_end DATE;
  v_days INT;
  v_blocked_count INT;
  v_reserved_count INT;
BEGIN
  IF p_end_date < p_start_date THEN
    RETURN jsonb_build_object('available', FALSE, 'reason', 'End date must be on or after start date.');
  END IF;

  SELECT p.*, pa.available_from, pa.available_until, pa.currently_in_use
  INTO v_product
  FROM public.products p
  LEFT JOIN public.product_availability pa ON pa.product_id = p.id
  WHERE p.id = p_product_id;

  IF NOT FOUND OR v_product.status <> 'APPROVED' OR v_product.is_active = FALSE THEN
    RETURN jsonb_build_object('available', FALSE, 'reason', 'Listing is not currently available.');
  END IF;
  IF COALESCE(v_product.currently_in_use, FALSE) THEN
    RETURN jsonb_build_object('available', FALSE, 'reason', 'Item is currently marked in use by the seller.');
  END IF;

  v_days := (p_end_date - p_start_date) + 1;
  IF v_days < v_product.min_rental_days OR v_days > v_product.max_rental_days THEN
    RETURN jsonb_build_object('available', FALSE, 'reason', format('Rental duration must be between %s and %s days.', v_product.min_rental_days, v_product.max_rental_days));
  END IF;
  IF v_product.available_from IS NOT NULL AND p_start_date < v_product.available_from THEN
    RETURN jsonb_build_object('available', FALSE, 'reason', 'Selected dates are before the listing availability window.');
  END IF;
  IF v_product.available_until IS NOT NULL AND p_end_date > v_product.available_until THEN
    RETURN jsonb_build_object('available', FALSE, 'reason', 'Selected dates extend beyond the listing availability window.');
  END IF;

  SELECT cleaning_buffer_days INTO v_buffer_days FROM public.admin_settings WHERE id = 1;
  v_buffer_days := COALESCE(v_buffer_days, 1);
  v_buffer_end := p_end_date + v_buffer_days;

  SELECT COUNT(*) INTO v_blocked_count
  FROM public.blocked_dates bd
  WHERE bd.product_id = p_product_id
    AND bd.start_date <= p_end_date
    AND bd.end_date >= p_start_date;
  IF v_blocked_count > 0 THEN
    RETURN jsonb_build_object('available', FALSE, 'reason', 'Seller has blocked one or more selected dates.');
  END IF;

  SELECT COUNT(*) INTO v_reserved_count
  FROM public.inventory_reservations ir
  WHERE ir.product_id = p_product_id
    AND (ir.status = 'CONFIRMED' OR (ir.status = 'HELD' AND ir.expires_at > NOW()))
    AND ir.start_date <= v_buffer_end
    AND ir.end_date >= p_start_date;
  IF v_reserved_count >= v_product.quantity THEN
    RETURN jsonb_build_object('available', FALSE, 'reason', 'Selected dates overlap with an existing reservation or cleaning buffer.');
  END IF;

  RETURN jsonb_build_object(
    'available', TRUE,
    'remaining_units', v_product.quantity - v_reserved_count,
    'buffer_end_date', v_buffer_end,
    'rental_days', v_days
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_product_unavailable_dates(
  p_product_id UUID,
  p_from_date DATE DEFAULT CURRENT_DATE,
  p_to_date DATE DEFAULT (CURRENT_DATE + 120)
)
RETURNS TABLE(start_date DATE, end_date DATE, source TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT bd.start_date, bd.end_date, 'BLOCKED'::TEXT
  FROM public.blocked_dates bd
  WHERE bd.product_id = p_product_id
    AND bd.end_date >= p_from_date
    AND bd.start_date <= p_to_date
  UNION ALL
  SELECT ir.start_date, ir.end_date, ir.status
  FROM public.inventory_reservations ir
  WHERE ir.product_id = p_product_id
    AND (ir.status = 'CONFIRMED' OR (ir.status = 'HELD' AND ir.expires_at > NOW()))
    AND ir.end_date >= p_from_date
    AND ir.start_date <= p_to_date;
END;
$$;

REVOKE ALL ON FUNCTION public.check_product_availability(UUID, DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_product_availability(UUID, DATE, DATE) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_product_unavailable_dates(UUID, DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_unavailable_dates(UUID, DATE, DATE) TO anon, authenticated, service_role;

-- Authenticated uploads must live under the uploader's own storage prefix.
DROP POLICY IF EXISTS storage_seller_upload_product_images ON storage.objects;
CREATE POLICY storage_seller_upload_product_images ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.seller_profiles AS seller
      WHERE seller.user_id = auth.uid()
        AND seller.verification_status IN ('VERIFIED', 'APPROVED')
    )
  );

DROP POLICY IF EXISTS storage_payment_proofs_upload ON storage.objects;
CREATE POLICY storage_payment_proofs_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS storage_return_evidence_upload ON storage.objects;
CREATE POLICY storage_return_evidence_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'return-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
