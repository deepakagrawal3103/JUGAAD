# ClosetLoop — Peer-to-Peer Fashion Rental Marketplace

> *"Your next look doesn't have to be yours."*

## Project Structure (Separated Frontend & Backend)

```
GeturPssPrice/
├── frontend/                   # Next.js App Router + TypeScript + Tailwind CSS (Port 3000)
│   ├── src/
│   │   ├── app/                # Pages (Storefront, Browse, Detail, Cart, Checkout, Dashboards, Admin)
│   │   ├── components/         # Reusable UI primitives & Stitch-inspired editorial components
│   │   ├── config/             # Configurable brand identity & catalog constants
│   │   ├── lib/api/            # Authenticated fetch client calling backend/
│   │   ├── lib/supabase/       # Supabase Auth browser & SSR cookie clients
│   │   └── types/              # Shared frontend types
│   └── .env.example
├── backend/                    # Standalone Express + TypeScript REST API (Port 4000)
│   ├── src/
│   │   ├── config/             # Environment & brand config
│   │   ├── domain/             # Pure pricing engine, IST date math, state machine, WhatsApp URL builder
│   │   ├── lib/                # Supabase service-role & anon clients
│   │   ├── middleware/         # Bearer JWT auth, role guards, rate limiter, error handler
│   │   ├── routes/             # Catalog, Wishlist, Cart, Bookings, Payments, Seller, Customer, Admin
│   │   ├── validators/         # Zod request schemas
│   │   ├── app.ts              # Express app factory
│   │   └── server.ts           # HTTP server entrypoint
│   ├── tests/                  # Vitest + Supertest unit & HTTP security tests
│   └── .env.example
├── supabase/
│   └── migrations/             # PostgreSQL schema, RLS policies, atomic booking RPCs, dev seed
└── docs/                       # Architecture, Database Schema, Design System & Development Plan
```

## Setup & Running Locally

### 1. Database Setup (Supabase)
Run the SQL files in `supabase/migrations/` in order inside your Supabase SQL Editor:
1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_booking_engine.sql`
4. *(Dev only)* `004_dev_seed.sql`

Promote your first admin user after registering in `/register`:
```sql
UPDATE public.users SET role = 'ADMIN' WHERE email = 'admin@yourdomain.com';
```

### 2. Backend Service (`backend/`)
Copy `backend/.env.example` to `backend/.env` and configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
```bash
cd backend
npm install
npm run typecheck
npm test
npm run dev
```

### 3. Frontend Web App (`frontend/`)
Copy `frontend/.env.example` to `frontend/.env.local` and configure `NEXT_PUBLIC_API_URL=http://localhost:4000`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
```bash
cd frontend
npm install
npm run typecheck
npm run build
npm run dev
```
