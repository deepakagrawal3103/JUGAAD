import Link from "next/link";
import { BRAND_CONFIG, POLICY_LINKS } from "@/config/brand";

export function SiteFooter({
  brandName,
  brandTagline,
}: {
  brandName: string;
  brandTagline: string;
}) {
  return (
    <footer className="bg-[#172337] text-white mt-12 pb-20 md:pb-0">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 space-y-3">
            <Link href="/" className="text-2xl font-bold italic tracking-tight text-white">
              {brandName}
            </Link>
            <p className="text-sm text-[#D6D6D6] max-w-xs leading-relaxed">{brandTagline}</p>
            <p className="text-xs text-[#878787] pt-1">
              Peer-owned fashion rental marketplace. Every listing is quality-checked and admin-verified before going live.
            </p>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#878787]">
              Marketplace
            </h3>
            <ul className="space-y-2 text-xs font-medium text-white">
              <li><Link href="/browse" className="hover:underline">Explore Rentals</Link></li>
              <li><Link href="/browse?sort=newly_added" className="hover:underline">New Arrivals</Link></li>
              <li><Link href="/browse?occasion=Weddings+%26+Sangeet" className="hover:underline">Wedding Edit</Link></li>
              <li><Link href="/seller/apply" className="hover:underline">List Your Outfit</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#878787]">
              My Account &amp; Support
            </h3>
            <ul className="space-y-2 text-xs font-medium text-white">
              <li><Link href="/dashboard" className="hover:underline">My Bookings</Link></li>
              <li><Link href="/wishlist" className="hover:underline">Saved Wishlist</Link></li>
              <li><Link href="/cart" className="hover:underline">Rental Bag</Link></li>
              <li><Link href="/contact" className="hover:underline text-[#FFE500]">Contact Us</Link></li>
            </ul>
            <div className="pt-2 space-y-1 text-xs text-[#D6D6D6]">
              <p>
                <a href={`tel:${BRAND_CONFIG.contactPhone.replace(/\s+/g, "")}`} className="hover:underline font-medium">
                  {BRAND_CONFIG.contactPhone}
                </a>
              </p>
              <p>
                <a href={`mailto:${BRAND_CONFIG.contactEmail}`} className="hover:underline break-all">
                  {BRAND_CONFIG.contactEmail}
                </a>
              </p>
            </div>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#878787]">
              Consumer Policies
            </h3>
            <ul className="grid grid-cols-1 gap-1.5 text-xs text-white">
              {POLICY_LINKS.map((policy) => (
                <li key={policy.slug}>
                  <Link href={`/policies/${policy.slug}`} className="hover:underline">
                    {policy.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#454D5E] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#878787]">
          <p>© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
          <p>IST (Asia/Kolkata) · Currency INR (₹)</p>
        </div>
      </div>
    </footer>
  );
}
