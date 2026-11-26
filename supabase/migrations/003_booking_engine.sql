-- ClosetLoop Migration 003: Atomic Inventory Reservation, Booking Checkout & Payment Verification RPCs

-- 1. Expire unpaid reservation holds automatically
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INT := 0;
  v_booking RECORD;
BEGIN
  UPDATE public.inventory_reservations
  SET status = 'EXPIRED', updated_at = NOW()
  WHERE status = 'HELD'
    AND expires_at IS NOT NULL
    AND expires_at <= NOW();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  FOR v_booking IN
    SELECT id, customer_id, booking_reference
    FROM public.bookings
    WHERE status = 'AWAITING_PAYMENT'
      AND payment_expires_at IS NOT NULL
      AND payment_expires_at <= NOW()
  LOOP
    UPDATE public.bookings
    SET status = 'CANCELLED',
        cancelled_at = NOW(),
        cancellation_reason = 'Reservation hold expired before payment submission',
        updated_at = NOW()
    WHERE id = v_booking.id;

    INSERT INTO public.booking_status_logs (booking_id, actor_role, previous_status, new_status, note)
    VALUES (v_booking.id, 'SYSTEM', 'AWAITING_PAYMENT', 'CANCELLED', 'Reservation hold expired automatically.');

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      v_booking.customer_id,
      'BOOKING_CANCELLED',
      'Reservation Hold Expired',
      'Your unpaid reservation ' || v_booking.booking_reference || ' has expired and dates were released.',
      '/dashboard/bookings/' || v_booking.id
    );
  END LOOP;

  RETURN v_expired_count;
END;
$$;

-- 2. Check product availability for [p_start_date, p_end_date] including cleaning buffer
CREATE OR REPLACE FUNCTION public.check_product_availability(
  p_product_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_buffer_days INT;
  v_buffer_end DATE;
  v_days INT;
  v_blocked_count INT;
  v_reserved_count INT;
BEGIN
  PERFORM public.release_expired_reservations();

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
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', format('Rental duration must be between %s and %s days.', v_product.min_rental_days, v_product.max_rental_days)
    );
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

-- 3. Public non-PII unavailable date intervals for calendar UI
CREATE OR REPLACE FUNCTION public.get_product_unavailable_dates(
  p_product_id UUID,
  p_from_date DATE DEFAULT CURRENT_DATE,
  p_to_date DATE DEFAULT (CURRENT_DATE + 120)
)
RETURNS TABLE(start_date DATE, end_date DATE, source TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.release_expired_reservations();

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

-- 4. Atomic Cart Checkout -> Booking + Reservation Hold
CREATE OR REPLACE FUNCTION public.create_booking_from_cart(
  p_customer_id UUID,
  p_delivery_address JSONB DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart_id UUID;
  v_settings RECORD;
  v_item RECORD;
  v_product RECORD;
  v_avail JSONB;
  v_booking_id UUID := gen_random_uuid();
  v_booking_ref TEXT;
  v_expires_at TIMESTAMPTZ;
  v_days INT;
  v_rental NUMERIC(10,2);
  v_commission NUMERIC(10,2);
  v_seller_earn NUMERIC(10,2);
  v_deposit NUMERIC(10,2);
  v_delivery NUMERIC(10,2);
  v_total_rental NUMERIC(10,2) := 0;
  v_total_commission NUMERIC(10,2) := 0;
  v_total_seller NUMERIC(10,2) := 0;
  v_total_deposit NUMERIC(10,2) := 0;
  v_total_delivery NUMERIC(10,2) := 0;
  v_total_payable NUMERIC(10,2) := 0;
  v_item_id UUID;
  v_primary_img TEXT;
  v_buffer_end DATE;
  v_item_count INT := 0;
BEGIN
  PERFORM public.release_expired_reservations();

  SELECT id INTO v_cart_id FROM public.carts WHERE user_id = p_customer_id;
  IF v_cart_id IS NULL THEN
    RAISE EXCEPTION 'Cart not found.';
  END IF;

  SELECT COUNT(*) INTO v_item_count FROM public.cart_items WHERE cart_id = v_cart_id;
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Your cart is empty.';
  END IF;

  SELECT * INTO v_settings FROM public.admin_settings WHERE id = 1;
  v_expires_at := NOW() + make_interval(mins => COALESCE(v_settings.reservation_hold_minutes, 20));
  v_booking_ref := 'CL-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYYMMDD') || '-' || UPPER(SUBSTRING(REPLACE(v_booking_id::TEXT, '-', '') FROM 1 FOR 6));

  -- Lock involved products in deterministic UUID order to prevent deadlocks & race conditions
  PERFORM 1 FROM public.products p
  INNER JOIN public.cart_items ci ON ci.product_id = p.id
  WHERE ci.cart_id = v_cart_id
  ORDER BY p.id
  FOR UPDATE;

  -- Pre-validate all items before inserting parent booking
  FOR v_item IN
    SELECT ci.*, p.seller_id, p.title, p.daily_price, p.security_deposit, p.fulfillment_options, sp.user_id AS seller_user_id
    FROM public.cart_items ci
    JOIN public.products p ON p.id = ci.product_id
    JOIN public.seller_profiles sp ON sp.id = p.seller_id
    WHERE ci.cart_id = v_cart_id
    ORDER BY p.id
  LOOP
    IF v_item.seller_user_id = p_customer_id THEN
      RAISE EXCEPTION 'You cannot rent your own listing (%).', v_item.title;
    END IF;

    v_avail := public.check_product_availability(v_item.product_id, v_item.start_date, v_item.end_date);
    IF NOT COALESCE((v_avail ->> 'available')::BOOLEAN, FALSE) THEN
      RAISE EXCEPTION 'Unavailable: % — %', v_item.title, COALESCE(v_avail ->> 'reason', 'Dates conflict');
    END IF;

    v_days := (v_item.end_date - v_item.start_date) + 1;
    v_rental := ROUND(v_item.daily_price * v_days, 2);
    v_commission := ROUND(v_rental * (v_settings.commission_percent / 100.0), 2);
    v_seller_earn := ROUND(v_rental - v_commission, 2);
    v_deposit := ROUND(v_item.security_deposit, 2);
    v_delivery := CASE
      WHEN v_item.fulfillment_type = 'SELLER_DELIVERY' THEN COALESCE((v_item.fulfillment_options ->> 'delivery_fee')::NUMERIC, 0)
      ELSE 0
    END;

    v_total_rental := v_total_rental + v_rental;
    v_total_commission := v_total_commission + v_commission;
    v_total_seller := v_total_seller + v_seller_earn;
    v_total_deposit := v_total_deposit + v_deposit;
    v_total_delivery := v_total_delivery + v_delivery;
  END LOOP;

  v_total_payable := v_total_rental + v_total_deposit + v_total_delivery;

  INSERT INTO public.bookings (
    id, booking_reference, customer_id, status, payment_status,
    total_rental_amount, total_commission_amount, total_seller_earnings,
    total_security_deposit, total_delivery_fee, total_payable,
    commission_rate_snapshot, cleaning_buffer_days_snapshot,
    payment_expires_at, delivery_address, customer_notes
  ) VALUES (
    v_booking_id, v_booking_ref, p_customer_id, 'AWAITING_PAYMENT', 'UNPAID',
    v_total_rental, v_total_commission, v_total_seller,
    v_total_deposit, v_total_delivery, v_total_payable,
    v_settings.commission_percent, COALESCE(v_settings.cleaning_buffer_days, 1),
    v_expires_at, p_delivery_address, p_customer_notes
  );

  FOR v_item IN
    SELECT ci.*, p.seller_id, p.title, p.daily_price, p.security_deposit, p.fulfillment_options
    FROM public.cart_items ci
    JOIN public.products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart_id
    ORDER BY p.id
  LOOP
    v_item_id := gen_random_uuid();
    v_days := (v_item.end_date - v_item.start_date) + 1;
    v_buffer_end := v_item.end_date + COALESCE(v_settings.cleaning_buffer_days, 1);
    v_rental := ROUND(v_item.daily_price * v_days, 2);
    v_commission := ROUND(v_rental * (v_settings.commission_percent / 100.0), 2);
    v_seller_earn := ROUND(v_rental - v_commission, 2);
    v_deposit := ROUND(v_item.security_deposit, 2);
    v_delivery := CASE
      WHEN v_item.fulfillment_type = 'SELLER_DELIVERY' THEN COALESCE((v_item.fulfillment_options ->> 'delivery_fee')::NUMERIC, 0)
      ELSE 0
    END;

    SELECT public_url INTO v_primary_img
    FROM public.product_images
    WHERE product_id = v_item.product_id
    ORDER BY is_primary DESC, sort_order ASC
    LIMIT 1;

    INSERT INTO public.booking_items (
      id, booking_id, product_id, seller_id, product_title_snapshot, product_image_snapshot,
      start_date, end_date, buffer_end_date, rental_days,
      daily_rate_snapshot, rental_amount, commission_percent_snapshot,
      commission_amount, seller_earnings, security_deposit, delivery_fee,
      fulfillment_type, return_deadline
    ) VALUES (
      v_item_id, v_booking_id, v_item.product_id, v_item.seller_id, v_item.title, v_primary_img,
      v_item.start_date, v_item.end_date, v_buffer_end, v_days,
      v_item.daily_price, v_rental, v_settings.commission_percent,
      v_commission, v_seller_earn, v_deposit, v_delivery,
      v_item.fulfillment_type,
      ((v_item.end_date::TEXT || ' 21:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
    );

    INSERT INTO public.inventory_reservations (
      product_id, booking_id, booking_item_id, start_date, end_date, status, expires_at
    ) VALUES (
      v_item.product_id, v_booking_id, v_item_id, v_item.start_date, v_buffer_end, 'HELD', v_expires_at
    );

    INSERT INTO public.commission_records (
      booking_id, booking_item_id, seller_id, gross_rental_amount, commission_rate, commission_amount, seller_net_amount
    ) VALUES (
      v_booking_id, v_item_id, v_item.seller_id, v_rental, v_settings.commission_percent, v_commission, v_seller_earn
    );
  END LOOP;

  INSERT INTO public.payments (booking_id, expected_amount, payment_method, status)
  VALUES (v_booking_id, v_total_payable, 'MANUAL_UPI', 'PENDING');

  INSERT INTO public.security_deposits (booking_id, customer_id, amount_expected, status)
  VALUES (v_booking_id, p_customer_id, v_total_deposit, 'PENDING_PAYMENT');

  INSERT INTO public.booking_status_logs (booking_id, actor_id, actor_role, previous_status, new_status, note)
  VALUES (v_booking_id, p_customer_id, 'CUSTOMER', NULL, 'AWAITING_PAYMENT', 'Booking created with temporary inventory hold.');

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    p_customer_id,
    'BOOKING_CREATED',
    'Reservation Hold Created',
    'Booking ' || v_booking_ref || ' is held for ' || COALESCE(v_settings.reservation_hold_minutes, 20) || ' minutes. Complete UPI payment to proceed.',
    '/checkout/' || v_booking_id
  );

  DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'booking_reference', v_booking_ref,
    'total_payable', v_total_payable,
    'payment_expires_at', v_expires_at
  );
END;
$$;

-- 5. Admin Payment Verification RPC
CREATE OR REPLACE FUNCTION public.admin_verify_payment(
  p_booking_id UUID,
  p_admin_id UUID,
  p_decision TEXT, -- 'VERIFIED' | 'REJECTED' | 'MORE_PROOF_REQUESTED'
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_booking RECORD;
  v_item RECORD;
  v_seller_user_id UUID;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = p_admin_id AND role = 'ADMIN' AND status = 'ACTIVE')
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden: Admin access required.';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  IF p_decision = 'VERIFIED' THEN
    UPDATE public.payments
    SET status = 'VERIFIED',
        verified_by = p_admin_id,
        verified_at = NOW(),
        rejection_reason = NULL
    WHERE booking_id = p_booking_id;

    UPDATE public.payment_proofs
    SET review_status = 'VERIFIED',
        reviewed_by = p_admin_id,
        reviewed_at = NOW(),
        review_note = p_note
    WHERE booking_id = p_booking_id AND review_status IN ('PENDING', 'MORE_PROOF_REQUESTED');

    UPDATE public.bookings
    SET status = 'CONFIRMED',
        payment_status = 'VERIFIED',
        confirmed_at = NOW(),
        payment_expires_at = NULL
    WHERE id = p_booking_id;

    UPDATE public.inventory_reservations
    SET status = 'CONFIRMED', expires_at = NULL
    WHERE booking_id = p_booking_id;

    UPDATE public.security_deposits
    SET status = 'HELD', amount_held = amount_expected
    WHERE booking_id = p_booking_id;

    FOR v_item IN SELECT * FROM public.booking_items WHERE booking_id = p_booking_id LOOP
      INSERT INTO public.seller_payouts (seller_id, booking_id, booking_item_id, amount, status)
      VALUES (v_item.seller_id, p_booking_id, v_item.id, v_item.seller_earnings, 'PENDING')
      ON CONFLICT (booking_item_id) DO NOTHING;

      UPDATE public.products SET rental_count = rental_count + 1 WHERE id = v_item.product_id;
      UPDATE public.seller_profiles SET total_rentals = total_rentals + 1 WHERE id = v_item.seller_id
      RETURNING user_id INTO v_seller_user_id;

      IF v_seller_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body, link)
        VALUES (
          v_seller_user_id,
          'BOOKING_CONFIRMED',
          'New Confirmed Rental',
          'Booking ' || v_booking.booking_reference || ' for "' || v_item.product_title_snapshot || '" is confirmed.',
          '/seller/bookings'
        );
      END IF;
    END LOOP;

    INSERT INTO public.booking_status_logs (booking_id, actor_id, actor_role, previous_status, new_status, note)
    VALUES (p_booking_id, p_admin_id, 'ADMIN', v_booking.status, 'CONFIRMED', COALESCE(p_note, 'UPI payment verified by admin.'));

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      v_booking.customer_id,
      'PAYMENT_VERIFIED',
      'Payment Verified & Booking Confirmed',
      'Your payment for ' || v_booking.booking_reference || ' is verified. Your rental is confirmed.',
      '/dashboard/bookings/' || p_booking_id
    );

  ELSIF p_decision IN ('REJECTED', 'MORE_PROOF_REQUESTED') THEN
    UPDATE public.payments
    SET status = CASE WHEN p_decision = 'REJECTED' THEN 'REJECTED' ELSE 'PENDING' END,
        rejection_reason = p_note
    WHERE booking_id = p_booking_id;

    UPDATE public.payment_proofs
    SET review_status = p_decision,
        reviewed_by = p_admin_id,
        reviewed_at = NOW(),
        review_note = p_note
    WHERE booking_id = p_booking_id AND review_status = 'PENDING';

    UPDATE public.bookings
    SET status = 'AWAITING_PAYMENT',
        payment_status = CASE WHEN p_decision = 'REJECTED' THEN 'REJECTED' ELSE 'UNPAID' END
    WHERE id = p_booking_id;

    INSERT INTO public.booking_status_logs (booking_id, actor_id, actor_role, previous_status, new_status, note)
    VALUES (p_booking_id, p_admin_id, 'ADMIN', v_booking.status, 'AWAITING_PAYMENT', COALESCE(p_note, 'Payment proof requires resubmission.'));

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      v_booking.customer_id,
      'PAYMENT_REJECTED',
      CASE WHEN p_decision = 'REJECTED' THEN 'Payment Verification Rejected' ELSE 'Additional Payment Proof Requested' END,
      COALESCE(p_note, 'Please review and resubmit your UPI payment proof for ' || v_booking.booking_reference),
      '/checkout/' || p_booking_id
    );
  ELSE
    RAISE EXCEPTION 'Invalid payment verification decision: %', p_decision;
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_role, entity_type, entity_id, action, metadata)
  VALUES (p_admin_id, 'ADMIN', 'PAYMENT', p_booking_id::TEXT, p_decision, jsonb_build_object('note', p_note));

  RETURN jsonb_build_object('success', TRUE, 'decision', p_decision);
END;
$$;
