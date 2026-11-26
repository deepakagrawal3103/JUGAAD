import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, RefreshCw, CalendarCheck, Tag } from "lucide-react";
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
    <div className="rounded-sm border border-dashed border-[#D6D8DC] bg-[#FAFAFA] px-6 py-10 text-center space-y-2.5">
      <p className="text-lg font-semibold text-[#212121]">{title}</p>
      <p className="text-xs sm:text-sm text-[#535766] max-w-md mx-auto">
        No approved listings in this collection yet. Be the first to list your outfit and start renting it out.
      </p>
      <div className="pt-1">
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 rounded-sm bg-[#2874F0] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#1C5EC9] transition-colors"
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
    <div className="space-y-4 sm:space-y-5 pb-10 bg-[#F1F3F6]">
      {/* FLIPKART TOP CATEGORY STRIP (Mobile + Desktop) */}
      <section id="categories" className="bg-white border-b border-[#E0E0E0] shadow-xs">
        <div className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto no-scrollbar">
            <Link
              href="/browse"
              className="shrink-0 flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-sm hover:bg-[#F5F8FF] group"
            >
              <span className="h-10 w-10 rounded-full bg-[#EBF2FE] text-[#2874F0] flex items-center justify-center text-xs font-bold">
                All
              </span>
              <span className="text-xs font-semibold text-[#212121] group-hover:text-[#2874F0]">
                All Outfits
              </span>
            </Link>
            {shell.categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/browse?category=${encodeURIComponent(cat.slug)}`}
                className="shrink-0 flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-sm hover:bg-[#F5F8FF] group"
              >
                <span className="h-10 w-10 rounded-full bg-[#F1F3F6] text-[#2874F0] flex items-center justify-center text-xs font-bold group-hover:bg-[#EBF2FE]">
                  {cat.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-xs font-medium text-[#212121] group-hover:text-[#2874F0] whitespace-nowrap">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FLIPKART HERO BANNER */}
      <section className="max-w-[1360px] mx-auto px-2 sm:px-6 lg:px-8">
        <div className="rounded-sm bg-gradient-to-r from-[#2874F0] via-[#1E63D6] to-[#174BA6] text-white p-6 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-xs">
          <div className="lg:col-span-7 space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#FFE500] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#212121]">
              <Tag className="h-3 w-3" /> RentKro Assured · Verified Wardrobes
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Your Next Look Doesn&apos;t Have To Be Bought!
            </h1>
            <p className="text-sm sm:text-base text-white/90 max-w-xl leading-relaxed">
              Rent designer lehengas, Banarasi sarees, tailored blazers, and occasionwear directly from verified wardrobes across India.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 rounded-sm bg-[#FB641B] text-white px-6 py-3 text-xs sm:text-sm font-bold uppercase tracking-wide hover:bg-[#E05512] transition-colors shadow-sm"
              >
                Explore Outfits <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/seller/apply"
                className="inline-flex items-center gap-2 rounded-sm bg-white text-[#2874F0] px-6 py-3 text-xs sm:text-sm font-bold uppercase tracking-wide hover:bg-[#F5F8FF] transition-colors shadow-sm"
              >
                List Your Outfit
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-sm bg-white text-[#212121] p-5 sm:p-6 space-y-4 shadow-md">
              <div className="border-b border-[#E0E0E0] pb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#878787]">
                  100% Transparent Pricing
                </span>
                <span className="rounded-sm bg-[#388E3C] px-2 py-0.5 text-[11px] text-white font-semibold">
                  Admin Verified
                </span>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-baseline">
                  <span className="text-[#535766]">Per Day Rental Example</span>
                  <span className="font-bold tabular-nums">₹1,000 / day</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[#535766]">Refundable Security Deposit</span>
                  <span className="font-bold text-[#388E3C] tabular-nums">₹500 (100% Refundable)</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-[#E0E0E0] pt-2.5">
                  <span className="text-[#535766]">Seller Share</span>
                  <span className="font-bold text-[#2874F0] tabular-nums">{sellerShare}% of Rent</span>
                </div>
              </div>
              <p className="text-[11px] text-[#878787] leading-relaxed">
                Every listing is reviewed by our admin team before going live. Dates lock instantly at checkout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3-DAY RENTAL POLICY STRIP */}
      <section className="max-w-[1360px] mx-auto px-2 sm:px-6 lg:px-8">
        <div className="rounded-sm border border-[#FFE082] bg-[#FFF9E6] px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 shadow-xs">
          <div className="space-y-0.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#E65100]">
              3-Day Rental Policy — Important Note
            </p>
            <p className="text-xs sm:text-sm text-[#212121]">
              You can collect and wear your outfit <strong>1 day before your event</strong> and must <strong>return it on the 3rd day</strong>. Late returns incur a <strong>30% charge of the rental amount per extra day</strong>.
            </p>
          </div>
          <Link href="/policies/rental-policy" className="text-xs font-bold text-[#2874F0] hover:underline shrink-0">
            READ POLICY →
          </Link>
        </div>
      </section>

      {/* FEATURED RENTALS (Flipkart White Section Card) */}
      <section className="max-w-[1360px] mx-auto px-2 sm:px-6 lg:px-8">
        <div className="bg-white rounded-sm border border-[#E0E0E0] shadow-xs p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3.5">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-[#212121]">Featured Rentals</h2>
              <p className="text-xs text-[#878787]">Curated &amp; quality-checked outfits</p>
            </div>
            <Link
              href="/browse"
              className="rounded-sm bg-[#2874F0] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-[#1C5EC9]"
            >
              View All
            </Link>
          </div>

          {home.featured.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {home.featured.map((product) => (
                <ProductCard key={product.id} product={product} initialWishlisted={wishlistSet.has(product.id)} />
              ))}
            </div>
          ) : (
            <EmptyCollectionState title="Curated Featured Looks Coming Soon" ctaLabel="List Your Outfit" ctaHref="/seller/apply" />
          )}
        </div>
      </section>

      {/* SHOP BY OCCASION */}
      <section className="max-w-[1360px] mx-auto px-2 sm:px-6 lg:px-8">
        <div className="bg-white rounded-sm border border-[#E0E0E0] shadow-xs p-4 sm:p-6 space-y-4">
          <div className="border-b border-[#F0F0F0] pb-3">
            <h2 className="text-lg sm:text-2xl font-bold text-[#212121]">Shop by Occasion</h2>
            <p className="text-xs text-[#878787]">Outfits tailored for every celebration</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {OCCASIONS.map((occasion) => (
              <Link
                key={occasion}
                href={`/browse?occasion=${encodeURIComponent(occasion)}`}
                className="rounded-sm border border-[#E0E0E0] bg-[#F8FAFF] p-3.5 sm:p-4 flex items-center justify-between hover:border-[#2874F0] hover:bg-[#EBF2FE] transition-colors group"
              >
                <span className="text-xs sm:text-sm font-semibold text-[#212121] group-hover:text-[#2874F0]">{occasion}</span>
                <ArrowRight className="h-4 w-4 text-[#878787] group-hover:text-[#2874F0] shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TRENDING OUTFITS */}
      <section className="max-w-[1360px] mx-auto px-2 sm:px-6 lg:px-8">
        <div className="bg-white rounded-sm border border-[#E0E0E0] shadow-xs p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3.5">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-[#212121]">Trending Outfits</h2>
              <p className="text-xs text-[#878787]">Most requested looks this week</p>
            </div>
            <Link
              href="/browse?sort=most_popular"
              className="rounded-sm bg-[#2874F0] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-[#1C5EC9]"
            >
              View All
            </Link>
          </div>

          {home.trending.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {home.trending.map((product) => (
                <ProductCard key={product.id} product={product} initialWishlisted={wishlistSet.has(product.id)} />
              ))}
            </div>
          ) : (
            <EmptyCollectionState title="Trending Edits Refreshing" ctaLabel="Explore Catalogue" ctaHref="/browse" />
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-[1360px] mx-auto px-2 sm:px-6 lg:px-8">
        <div className="bg-white rounded-sm border border-[#E0E0E0] shadow-xs p-4 sm:p-6 space-y-4">
          <div className="border-b border-[#F0F0F0] pb-3">
            <h2 className="text-lg sm:text-2xl font-bold text-[#212121]">How RentKro Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: "01", icon: CalendarCheck, title: "Choose Your Dates", body: "Select your event dates and reserve an available slot on the calendar." },
              { step: "02", icon: ShieldCheck, title: "Pay via UPI", body: "Scan and pay via UPI, then upload your UTR screenshot for quick verification." },
              { step: "03", icon: Sparkles, title: "Wear & Flaunt", body: "Opt for self-pickup or doorstep delivery. Look your best at the event!" },
              { step: "04", icon: RefreshCw, title: "Return & Get Refund", body: "Return the garment by the deadline and receive your full security deposit back." },
            ].map((item) => (
              <div key={item.step} className="rounded-sm border border-[#F0F0F0] bg-[#FAFAFA] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono-ref text-xs font-bold text-[#2874F0]">{item.step}</span>
                  <item.icon className="h-5 w-5 text-[#FB641B]" strokeWidth={1.8} />
                </div>
                <h3 className="text-base font-bold text-[#212121]">{item.title}</h3>
                <p className="text-xs text-[#535766] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECENTLY ADDED */}
      <section className="max-w-[1360px] mx-auto px-2 sm:px-6 lg:px-8">
        <div className="bg-white rounded-sm border border-[#E0E0E0] shadow-xs p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3.5">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-[#212121]">Recently Added</h2>
              <p className="text-xs text-[#878787]">Freshly approved wardrobes</p>
            </div>
            <Link
              href="/browse?sort=newly_added"
              className="rounded-sm bg-[#2874F0] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-[#1C5EC9]"
            >
              See New
            </Link>
          </div>

          {home.recent.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {home.recent.map((product) => (
                <ProductCard key={product.id} product={product} initialWishlisted={wishlistSet.has(product.id)} />
              ))}
            </div>
          ) : (
            <EmptyCollectionState title="No Approved Listings Yet" ctaLabel="Submit the First Listing" ctaHref="/seller/apply" />
          )}
        </div>
      </section>

      {/* BECOME A SELLER BANNER */}
      <section className="max-w-[1360px] mx-auto px-2 sm:px-6 lg:px-8">
        <div className="rounded-sm bg-[#172337] text-white p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center shadow-xs">
          <div className="lg:col-span-8 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#FFE500]">Become a Seller on RentKro</p>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
              Turn your occasionwear into regular income.
            </h2>
            <p className="text-xs sm:text-sm text-[#D6D6D6] max-w-2xl leading-relaxed">
              List your designer outfits after admin approval and protect your garments with 100% refundable security deposits.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <Link
              href="/seller/apply"
              className="inline-flex items-center gap-2 rounded-sm bg-[#FB641B] text-white px-6 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wide hover:bg-[#E05512] transition-colors"
            >
              Become a Seller <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
