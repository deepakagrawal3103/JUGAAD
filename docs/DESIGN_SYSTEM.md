# ClosetLoop — Editorial Design System

## 1. Visual Identity & Aesthetic Direction
- **Tone:** Contemporary luxury editorial fashion rental (inspired by Net-a-Porter, Hurr, SSENSE, and modern Indian designer lookbooks).
- **Principles:** Generous whitespace, crisp 1px structural borders, high-contrast typography, large portrait product imagery (`3:4` aspect ratio), subtle motion (`150ms–200ms ease-out`), zero visual clutter.
- **Explicit Anti-Patterns (Strictly Avoided):**
  - Neon gradients, glassmorphism cards, heavy drop shadows, rainbow badges, emoji-cluttered copy, or generic SaaS dashboard widgets.

---

## 2. Color Palette (Warm Editorial Neutrals)

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--bg-canvas` | `#FAF8F5` | Warm off-white primary canvas |
| `--bg-surface` | `#FFFFFF` | Elevated cards, drawers, modals |
| `--bg-cream` | `#F3EFEA` | Secondary editorial bands, category pills |
| `--bg-muted` | `#ECE7E0` | Skeleton loaders, subtle hover fills |
| `--ink-primary` | `#161616` | Headlines, primary body, primary CTAs |
| `--ink-secondary` | `#57534E` | Metadata, labels, captions (warm stone) |
| `--ink-muted` | `#8C857B` | Placeholders, disabled text |
| `--border-hairline` | `#E4DFD7` | 1px structural grid lines & dividers |
| `--accent-terracotta` | `#8A4B38` | Sparing editorial accent (featured tags, active states) |
| `--accent-sage` | `#2F5D46` | Verified / Approved / Confirmed status |
| `--accent-amber` | `#9A6B1E` | Pending review / Payment verification / Return due |
| `--accent-crimson` | `#9E2A2B` | Rejected / Overdue / Disputed / Destructive actions |

---

## 3. Typography
- **Display / Editorial Headings:** `Cormorant Garamond` (Serif, weights 500, 600) — used for hero headlines, section titles, and brand wordmark.
- **UI & Body:** `Plus Jakarta Sans` (Sans-serif, weights 400, 500, 600, 700) — clean geometric legibility for prices, filters, tables, and forms.
- **Monospace (References & Financial IDs):** `JetBrains Mono` — used for Booking IDs (`CL-...`), UTR numbers, and INR tabular amounts (`tabular-nums`).

---

## 4. Layout & Component Standards
- **Container Max Width:** `1360px` (`max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8`).
- **Product Card Spec:**
  - `3:4` portrait image container with subtle scale on hover (`scale-[1.02]`).
  - Top-right minimal Wishlist heart icon button; top-left single availability or condition pill.
  - Below image: Brand (uppercase tracking `0.08em`, `11px`), Title (single line truncate), Size & City metadata, **Rent: `₹X / day`** in bold + **`₹Y refundable deposit`** cleanly separated beneath.
- **Responsive Breakpoints:**
  - Mobile-first (`< 640px`): 2-column product grid, sticky bottom checkout bar on detail/cart pages, slide-over filter & nav drawers.
  - Tablet (`640px–1024px`): 3-column product grid.
  - Desktop (`>= 1024px`): 4-column product grid, persistent filter rail, clean editorial header.
