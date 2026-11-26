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
        Abhi tak is collection me koi approved listing nahi hai. Sabse pehle apna outfit list karo aur earn karna start karo.
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
              Aapka Agla Look, Kharidna Zaroori Nahi!
            </h1>
            <p className="text-base sm:text-lg text-[#57534E] max-w-xl leading-relaxed">
              Designer lehengas, banarasi sarees, stylish blazers aur occasionwear rent karo direct verified wardrobes se. Rent pe lo, pehno aur wapas return karo bina kisi jhanjhat ke.
            </p>
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 rounded-xl bg-[#EB5E4C] text-white px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[#D94E3D] transition-colors"
              >
                Explore Outfits <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/seller/apply"
                className="inline-flex items-center gap-2 rounded-xl border border-[#161616] bg-white text-[#161616] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[#161616] hover:text-white transition-colors"
              >
                Apna Outfit List Karo
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#E4DFD7] bg-white p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="border-b border-[#E4DFD7] pb-4 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[#8C857B]">
                  100% Transparent Pricing
                </span>
                <span className="rounded-full bg-[#EDF5F0] px-2.5 py-0.5 text-[11px] text-[#2F5D46] font-semibold">
                  Admin Verified
                </span>
              </div>
              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between items-baseline">
                  <span className="text-[#57534E]">Per Day Rental Example</span>
                  <span className="font-semibold tabular-nums">₹1,000 / day</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[#57534E]">Refundable Security Deposit</span>
                  <span className="font-semibold tabular-nums">₹500 (100% Wapas)</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-[#E4DFD7] pt-3">
                  <span className="text-[#57534E]">Lender / Seller Ki Kamai</span>
                  <span className="font-semibold text-[#2F5D46] tabular-nums">{sellerShare}% Rent</span>
                </div>
              </div>
              <p className="text-xs text-[#8C857B] leading-relaxed">
                Har ek listing pehle admin review karti hai. Dates checkout par instant lock ho jaate hain taaki double-booking na ho sake.
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#EB5E4C]">Easy &amp; Safe Process</p>
          <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#161616]">
            ClosetLoop Kaise Kaam Karta Hai?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { step: "01", icon: CalendarCheck, title: "Dates Choose Karo", body: "Apne event ke hisaab se rental dates select karo aur available slot reserve karo." },
            { step: "02", icon: ShieldCheck, title: "UPI Se Pay Karo", body: "Scan karke UPI payment karo aur UTR screenshot upload karke instant verify karwao." },
            { step: "03", icon: Sparkles, title: "Pehno Aur Flaunt Karo", body: "Direct lender se pickup ya door delivery lo. Designer outfit pehno aur event enjoy karo!" },
            { step: "04", icon: RefreshCw, title: "Wapas Karo, Deposit Pao", body: "Return deadline par garment wapas handover karo aur apna pura security deposit wapas pao." },
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
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#EB5E4C]">Apni Almirah Se Kamai Karo</p>
            <h2 className="font-editorial text-3xl sm:text-5xl font-semibold leading-tight">
              Wardrobe me rakhe party wear ko banao regular income.
            </h2>
            <p className="text-sm sm:text-base text-[#D6CFC5] max-w-2xl leading-relaxed">
              Har rental par pao {sellerShare}% direct kamai. Aur 100% security deposit protection aapke kapdon ko rakhega safe.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <Link
              href="/seller/apply"
              className="inline-flex items-center gap-2 rounded-xl bg-[#EB5E4C] text-white px-7 py-4 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[#D94E3D] transition-colors"
            >
              Lender / Seller Bano <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
