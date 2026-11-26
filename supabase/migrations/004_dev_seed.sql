-- ClosetLoop Development Seed Data (ONLY for development/testing — never run fake listings in production)
-- Replace <DEV_SELLER_AUTH_UUID> with a real auth.users UUID created in your dev Supabase project before running.

-- Example: Update admin_settings for local testing
UPDATE public.admin_settings
SET
  upi_id = 'closetloop.demo@okaxis',
  upi_display_name = 'ClosetLoop Rentals Pvt Ltd',
  whatsapp_number = '919999999999'
WHERE id = 1;

-- Sample active editorial banner
INSERT INTO public.banners (title, subtitle, cta_label, cta_href, placement, display_order, is_active)
VALUES (
  'Occasionwear, Circulated.',
  'Discover curated designer lehengas, tailored blazers, and statement silhouettes from verified wardrobes across India.',
  'Explore Rentals',
  '/browse',
  'HERO',
  1,
  TRUE
)
ON CONFLICT DO NOTHING;
