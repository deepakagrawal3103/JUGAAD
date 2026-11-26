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
    <footer className="border-t border-[#E4DFD7] bg-[#F3EFEA] text-[#161616] mt-20 pb-20 md:pb-0">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4 space-y-3">
            <Link href="/" className="font-editorial text-3xl font-semibold tracking-tight">
              {brandName}
            </Link>
            <p className="text-sm text-[#57534E] max-w-xs leading-relaxed">{brandTagline}</p>
            <p className="text-xs text-[#8C857B] pt-2">
              Peer-owned fashion marketplace. Har listing curate aur verify hoke live hoti hai.
            </p>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs font-sans font-semibold uppercase tracking-[0.12em] text-[#57534E]">
              Marketplace
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/browse" className="hover:underline">Rentals Dekho</Link></li>
              <li><Link href="/browse?sort=newly_added" className="hover:underline">Naya Aaya</Link></li>
              <li><Link href="/browse?occasion=Weddings+%26+Sangeet" className="hover:underline">Shaadi Edit</Link></li>
              <li><Link href="/seller/apply" className="hover:underline">Apna Outfit List Karo</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-sans font-semibold uppercase tracking-[0.12em] text-[#57534E]">
              Mera Account
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/dashboard" className="hover:underline">Meri Bookings</Link></li>
              <li><Link href="/wishlist" className="hover:underline">Saved Wishlist</Link></li>
              <li><Link href="/cart" className="hover:underline">Rental Bag</Link></li>
              <li><Link href="/contact" className="hover:underline font-medium text-[#EB5E4C]">Contact Us</Link></li>
            </ul>
            <div className="pt-2 space-y-1 text-xs text-[#57534E]">
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
            <h3 className="text-xs font-sans font-semibold uppercase tracking-[0.12em] text-[#57534E]">
              Policies &amp; Bharosa
            </h3>
            <ul className="grid grid-cols-1 gap-1.5 text-sm">
              {POLICY_LINKS.map((policy) => (
                <li key={policy.slug}>
                  <Link href={`/policies/${policy.slug}`} className="text-[#57534E] hover:text-[#161616] hover:underline">
                    {policy.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#E4DFD7] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8C857B]">
          <p>© {new Date().getFullYear()} {brandName}. Draft policies legal review ke liye subject hain.</p>
          <p>IST (Asia/Kolkata) · Currency INR (₹)</p>
        </div>
      </div>
    </footer>
  );
}
