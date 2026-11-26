-- ClosetLoop Sample / Demo Users Seed
-- Creates Admin, Seller, and Customer accounts in Supabase Auth and public schema tables.
-- Password for all accounts below is set to bcrypt hash of their respective passwords.
-- Admin:    admin@closetloop.in   / Admin@123456
-- Seller:   seller@closetloop.in  / Seller@123456
-- Customer: user@closetloop.in    / User@123456

DO $$
DECLARE
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
  v_seller_id UUID := '00000000-0000-0000-0000-000000000002';
  v_customer_id UUID := '00000000-0000-0000-0000-000000000003';
  v_admin_enc_pw TEXT := crypt('Admin@123456', gen_salt('bf'));
  v_seller_enc_pw TEXT := crypt('Seller@123456', gen_salt('bf'));
  v_customer_enc_pw TEXT := crypt('User@123456', gen_salt('bf'));
BEGIN
  -- 1. Insert Auth Users if not present
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
  (
    v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin@closetloop.in', v_admin_enc_pw, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"ClosetLoop Admin"}', NOW(), NOW()
  ),
  (
    v_seller_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'seller@closetloop.in', v_seller_enc_pw, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Riya Sharma"}', NOW(), NOW()
  ),
  (
    v_customer_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'user@closetloop.in', v_customer_enc_pw, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Aarav Mehta"}', NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = NOW();

  -- 2. Ensure public.users roles
  INSERT INTO public.users (id, email, role, status)
  VALUES
    (v_admin_id, 'admin@closetloop.in', 'ADMIN', 'ACTIVE'),
    (v_seller_id, 'seller@closetloop.in', 'SELLER', 'ACTIVE'),
    (v_customer_id, 'user@closetloop.in', 'CUSTOMER', 'ACTIVE')
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status;

  -- 3. Profiles
  INSERT INTO public.user_profiles (user_id, full_name, phone, city, state, address_line, pincode)
  VALUES
    (v_admin_id, 'ClosetLoop Admin', '919999999999', 'Pune', 'Maharashtra', 'Shivaji Nagar', '411005'),
    (v_seller_id, 'Riya Sharma', '919876543210', 'Pune', 'Maharashtra', 'Kothrud', '411038'),
    (v_customer_id, 'Aarav Mehta', '919123456780', 'Pune', 'Maharashtra', 'Bavdhan', '411021')
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    city = EXCLUDED.city;

  -- 4. Seller profile for Riya
  INSERT INTO public.seller_profiles (id, user_id, display_name, bio, city, state, pickup_address, payout_upi_id, is_verified, rating_avg)
  VALUES (
    '00000000-0000-0000-0000-000000000020',
    v_seller_id,
    'Riya M.',
    'Designer wardrobe curator based in Kothrud, Pune. Curated occasionwear.',
    'Pune',
    'Maharashtra',
    'Flat 402, Mayur Colony, Kothrud, Pune',
    'riya.sharma@okhdfcbank',
    TRUE,
    4.9
  )
  ON CONFLICT (id) DO NOTHING;

END $$;
