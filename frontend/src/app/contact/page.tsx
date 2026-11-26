import Link from "next/link";
import { Phone, Mail, MessageCircle, Clock, ShieldCheck } from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand";

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="border-b border-[#E4DFD7] pb-6 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#EB5E4C]">Customer &amp; Seller Support</p>
        <h1 className="font-editorial text-4xl font-semibold text-[#161616]">Contact Us — Get in Touch</h1>
        <p className="text-sm text-[#57534E]">
          Reach out to us anytime for booking assistance, UPI payment verification, security deposit refunds, or seller onboarding.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href={`tel:${BRAND_CONFIG.contactPhone.replace(/\s+/g, "")}`}
          className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-3 hover:border-[#161616] transition-colors"
        >
          <div className="h-10 w-10 rounded-xl bg-[#FDECE9] text-[#EB5E4C] flex items-center justify-center">
            <Phone className="h-5 w-5" />
          </div>
          <h2 className="font-semibold text-base text-[#161616]">Phone / Call Us</h2>
          <p className="text-sm font-mono-ref font-semibold text-[#161616]">{BRAND_CONFIG.contactPhone}</p>
          <p className="text-xs text-[#8C857B]">Tap to call directly</p>
        </a>

        <a
          href={`mailto:${BRAND_CONFIG.contactEmail}`}
          className="rounded-2xl border border-[#E4DFD7] bg-white p-6 space-y-3 hover:border-[#161616] transition-colors"
        >
          <div className="h-10 w-10 rounded-xl bg-[#F3EFEA] text-[#161616] flex items-center justify-center">
            <Mail className="h-5 w-5" />
          </div>
          <h2 className="font-semibold text-base text-[#161616]">Email Us</h2>
          <p className="text-sm font-medium text-[#161616] break-all">{BRAND_CONFIG.contactEmail}</p>
          <p className="text-xs text-[#8C857B]">Replies within 24 hours</p>
        </a>

        <a
          href={`https://wa.me/${BRAND_CONFIG.contactWhatsapp}?text=${encodeURIComponent("Hello! I need help with my ClosetLoop rental.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-[#C4DACB] bg-[#EDF5F0] p-6 space-y-3 hover:border-[#2F5D46] transition-colors"
        >
          <div className="h-10 w-10 rounded-xl bg-[#2F5D46] text-white flex items-center justify-center">
            <MessageCircle className="h-5 w-5" />
          </div>
          <h2 className="font-semibold text-base text-[#2F5D46]">WhatsApp Support</h2>
          <p className="text-sm font-mono-ref font-semibold text-[#2F5D46]">{BRAND_CONFIG.contactPhone}</p>
          <p className="text-xs text-[#2F5D46]">Payment screenshots &amp; instant help</p>
        </a>
      </div>

      <div className="rounded-2xl border border-[#E4DFD7] bg-[#F3EFEA]/60 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#161616] flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#EB5E4C]" /> Support Hours: Monday – Saturday, 10:00 AM – 8:00 PM IST
          </p>
          <p className="text-xs text-[#57534E] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#2F5D46]" /> Security deposit refunds and urgent return queries are also handled on Sundays.
          </p>
        </div>
        <Link href="/browse" className="rounded-xl bg-[#161616] text-white px-5 py-2.5 text-xs font-semibold shrink-0">
          Explore Rentals
        </Link>
      </div>
    </div>
  );
}
