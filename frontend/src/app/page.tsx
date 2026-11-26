import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, RefreshCw, CalendarCheck } from "lucide-react";
import { OCCASIONS } from "@/config/brand";
import { getHomepageData, getPublicMarketplaceShellData } from "@/lib/data/marketplace";
import { ProductCard } from "@/components/marketplace/ProductCard";

export const dynamic = "force-dynamic";

function EmptyCollectionState({
  title,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D6CFC5] bg-white px-6 py-12 text-center space-y-3">
      <p className="font-editorial text-2xl text-[#161616]">{title}</p>
      <p className="text-sm text-[#57534E] max-w-md mx-auto">
        No approved listings have been published in this collection yet. Be the first closet owner to submit a look for curation.
      </p>
      <div className="pt-2">
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 rounded-xl border border-[#161616] px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-[#161616] hover:bg-[#161616] hover:text-white transition-colors"
        >
          {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [shell, home] = await Promise.all([
    getPublicMarketplaceShellData(),
    getHomepageData(),
  ]);

  const heroBanner = home.banners.find((b: { placement?: string }) => b.placement === "HERO");
  const wishlistSet = new Set(home.wishlistProductIds);
  const sellerShare = 100 - shell.settings.commission_percent;

  return (
    <div className="space-y-16 sm:space-y-20 pb-10">
      {/* HERO */}
      <section className="border-b border-[#E4DFD7] bg-[#F3EFEA]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <span className="inline-block rounded-full bg-[#FDECE9] border border-[#F7C9C3] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D94E3D]">
              Peer-to-Peer Luxury &amp; Occasion Rental
            </span>
            <h1 className="font-editorial text-4xl sm:text-6xl font-semibold tracking-tight text-[#161616] leading-[1.06]">
              {heroBanner?.title || shell.settings.brand_tagline}
            </h1>
            <p className="text-base sm:text-lg text-[#57534E] max-w-xl leading-relaxed">
              {heroBanner?.subtitle ||
                `Rent curated lehengas, sarees, tailored blazers, and statement silhouettes directly from verified wardrobes on ${shell.settings.brand_name}.`}
            </p>
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                href={heroBanner?.cta_href || "/browse"}
                className="inline-flex items-center gap-2 rounded-xl bg-[#EB5E4C] text-white px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[#D94E3D] transition-colors"
              >
                {heroBanner?.cta_label || "Explore Rentals"} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/seller/apply"
                className="inline-flex items-center gap-2 rounded-xl border border-[#161616] bg-white text-[#161616] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[#161616] hover:text-white transition-colors"
              >
                List Your Outfit
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#E4DFD7] bg-white p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="border-b border-[#E4DFD7] pb-4 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[#8C857B]">
                  100% Transparent Model
                </span>
                <span className="rounded-full bg-[#EDF5F0] px-2.5 py-0.5 text-[11px] text-[#2F5D46] font-semibold">
                  Admin Verified
                </span>
              </div>
              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between items-baseline">
                  <span className="text-[#57534E]">Example Daily Rental</span>
                  <span className="font-semibold tabular-nums">₹1,000 / day</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[#57534E]">Refundable Security Deposit</span>
                  <span className="font-semibold tabular-nums">₹500 (0% fee)</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-[#E4DFD7] pt-3">
                  <span className="text-[#57534E]">Closet Owner Receives</span>
                  <span className="font-semibold text-[#2F5D46] tabular-nums">{sellerShare}% of rent</span>
                </div>
              </div>
              <p className="text-xs text-[#8C857B] leading-relaxed">
                Every listing is reviewed before publication. Dates are atomically locked during checkout to prevent double-booking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SHOP BY CATEGORY */}
      <section id="categories" className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between border-b border-[#E4DFD7] pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Browse Silhouettes</p>
            <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#161616]">
              Shop by Category
            </h2>
          </div>
          <Link href="/browse" className="text-xs font-semibold text-[#EB5E4C] hover:underline">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {shell.categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/browse?category=${encodeURIComponent(cat.slug)}`}
              className="rounded-2xl border border-[#E4DFD7] bg-white px-4 py-4 text-center hover:border-[#EB5E4C] hover:bg-[#FDECE9]/30 transition-colors"
            >
              <span className="text-sm font-medium text-[#161616]">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between border-b border-[#E4DFD7] pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#EB5E4C]">Curated Edit</p>
            <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#161616]">Featured Rentals</h2>
          </div>
          <Link href="/browse" className="text-xs font-semibold text-[#EB5E4C] hover:underline">Explore All →</Link>
        </div>

        {home.featured.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-5">
            {home.featured.map((product) => (
              <ProductCard key={product.id} product={product} initialWishlisted={wishlistSet.has(product.id)} />
            ))}
          </div>
        ) : (
          <EmptyCollectionState title="Curated Featured Looks Coming Soon" ctaLabel="List Your Outfit" ctaHref="/seller/apply" />
        )}
      </section>

      {/* SHOP BY OCCASION */}
      <section className="border-y border-[#E4DFD7] bg-[#F3EFEA] py-14">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Dressed For The Moment</p>
            <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#161616]">Shop by Occasion</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {OCCASIONS.map((occasion) => (
              <Link
                key={occasion}
                href={`/browse?occasion=${encodeURIComponent(occasion)}`}
                className="rounded-2xl border border-[#E4DFD7] bg-white p-5 flex items-center justify-between hover:border-[#EB5E4C] transition-colors group"
              >
                <span className="font-editorial text-xl font-medium text-[#161616]">{occasion}</span>
                <ArrowRight className="h-4 w-4 text-[#8C857B] group-hover:text-[#EB5E4C] transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TRENDING */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between border-b border-[#E4DFD7] pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Most Requested</p>
            <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#161616]">Trending Outfits</h2>
          </div>
          <Link href="/browse?sort=most_popular" className="text-xs font-semibold text-[#EB5E4C] hover:underline">View Popular →</Link>
        </div>

        {home.trending.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-5">
            {home.trending.map((product) => (
              <ProductCard key={product.id} product={product} initialWishlisted={wishlistSet.has(product.id)} />
            ))}
          </div>
        ) : (
          <EmptyCollectionState title="Trending Wardrobe Archive" ctaLabel="Browse Catalog" ctaHref="/browse" />
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#EB5E4C]">Seamless Circularity</p>
          <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#161616]">
            How {shell.settings.brand_name} Works
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { step: "01", icon: CalendarCheck, title: "Select Verified Dates", body: "Verify real-time calendar availability and lock dates with an instant reservation hold." },
            { step: "02", icon: ShieldCheck, title: "Pay via UPI & Verify", body: "Complete UPI payment, submit your UTR reference, and receive verified confirmation." },
            { step: "03", icon: Sparkles, title: "Wear With Confidence", body: "Pick up locally or opt for seller delivery. Enjoy designer pieces for a fraction of retail." },
            { step: "04", icon: RefreshCw, title: "Return & Deposit Refund", body: "Return by your deadline. Once inspection clears, your security deposit is refunded." },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono-ref text-xs text-[#8C857B]">{item.step}</span>
                <item.icon className="h-5 w-5 text-[#EB5E4C]" strokeWidth={1.6} />
              </div>
              <h3 className="font-editorial text-2xl font-medium text-[#161616]">{item.title}</h3>
              <p className="text-sm text-[#57534E] leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RECENTLY ADDED */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between border-b border-[#E4DFD7] pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Just Approved</p>
            <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#161616]">Recently Added</h2>
          </div>
          <Link href="/browse?sort=newly_added" className="text-xs font-semibold text-[#EB5E4C] hover:underline">See All New →</Link>
        </div>

        {home.recent.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-5">
            {home.recent.map((product) => (
              <ProductCard key={product.id} product={product} initialWishlisted={wishlistSet.has(product.id)} />
            ))}
          </div>
        ) : (
          <EmptyCollectionState title="No Approved Listings Yet" ctaLabel="Submit the First Listing" ctaHref="/seller/apply" />
        )}
      </section>

      {/* BECOME A SELLER */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#161616] text-[#FAF8F5] p-8 sm:p-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#EB5E4C]">Monetize Your Wardrobe</p>
            <h2 className="font-editorial text-3xl sm:text-5xl font-semibold leading-tight">
              Turn unworn occasionwear into recurring income.
            </h2>
            <p className="text-sm sm:text-base text-[#D6CFC5] max-w-2xl leading-relaxed">
              Earn {sellerShare}% of every rental while refundable security deposits protect your garments.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <Link
              href="/seller/apply"
              className="inline-flex items-center gap-2 rounded-xl bg-[#EB5E4C] text-white px-7 py-4 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[#D94E3D] transition-colors"
            >
              Become a Seller <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
