# Timelapse Event Pilot: Render + Vercel Setup

The API runs as a Render web service. The Next.js site runs on Vercel. Configure Supabase before inviting sellers or participants; this repository does not contain a live Supabase project or credentials.

## 1. Supabase

1. Create a Supabase project and configure Auth email/password sign-in.
2. Apply `001_initial_schema.sql`, `002_rls_policies.sql`, `003_booking_engine.sql`, then `006_security_hardening.sql` in that order. Skip `004_dev_seed.sql` and `005_sample_credentials.sql` on production; they are development-only seed data.
3. In Supabase Auth URL Configuration, set the Site URL to the production Vercel origin. Add production and preview callback URLs ending in `/auth/callback` to the redirect allow-list.
4. Enable Google under Auth Providers. In Google Cloud OAuth credentials, set the Supabase callback URI shown by Supabase as an authorized redirect URI. Add Vercel origins as authorized JavaScript origins if required by the provider setup.
5. Create the first admin through a trusted administrative process and grant the `ADMIN` role. Never grant admin from browser-supplied signup metadata.
6. Create private `payment-proofs` and `return-evidence` buckets, and the public `product-images` bucket. Configure event UPI details and QR image in Admin Settings before accepting payments.

## 2. Render API

Create a Render Blueprint from the repository root using `render.yaml`, or create a Node web service with root directory `backend`, build command `npm ci && npm run build`, start command `npm start`, and health check `/health`.

Set these server-only environment variables in Render:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — keep this secret in Render; never add it to Vercel or client code.
- `CORS_ORIGIN` — exact Vercel origin(s), comma-separated if needed; no wildcard or localhost in production.

Render provides `PORT`; the server binds to `0.0.0.0`. Verify `https://<render-service>/health` returns `{ "status": "ok", ... }` after deploy.

## 3. Vercel frontend

Create a Vercel project with root directory `frontend` and the Next.js framework preset. Set these variables separately for Production and Preview as appropriate:

- `NEXT_PUBLIC_API_URL` — Render API origin, without a trailing slash.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public/anon key only.
- `NEXT_PUBLIC_SITE_URL` — matching Vercel origin.

Redeploy after changing environment variables. Set Render `CORS_ORIGIN` to the exact production frontend origin and any preview origins allowed to call the API.

## 4. Event flow and launch checks

- Buyer: create/sign in with Google or email, add a listing to cart, submit details, transfer the displayed amount, then submit UTR and proof. The booking remains pending until an admin verifies it.
- Seller: create/sign in with the same Google or email identity, submit seller details, wait for admin approval, then create listings for admin review.
- Admin: verify seller applications and listings, review payment proofs, and approve payments through the admin panel. Only verified bookings should appear as sold/confirmed.
- Run the project checks in `backend` and `frontend` after configuring project variables; verify Google signup, email signup, seller approval, buyer payment submission, and admin payment verification against the deployed environment before the event.

No site can be promised “unhackable.” This setup adds server-side role checks, RLS and restricted database grants, private payment evidence, request validation, upload signature checks, rate limits, production CORS validation, and security headers. Keep dependencies patched, enable MFA for admins, and monitor provider logs.
