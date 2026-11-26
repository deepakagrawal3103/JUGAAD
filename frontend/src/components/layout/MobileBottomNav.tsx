"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Compass, Heart, UserCheck } from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#E0E0E0] bg-white px-2 py-1.5 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
      <div className="grid grid-cols-5 items-center text-[11px]">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 py-1 ${
            pathname === "/" ? "text-[#2874F0] font-semibold" : "text-[#535766]"
          }`}
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>

        <Link
          href="/#categories"
          className="flex flex-col items-center gap-0.5 py-1 text-[#535766]"
        >
          <LayoutGrid className="h-5 w-5" />
          <span>Categories</span>
        </Link>

        <Link
          href="/browse"
          className={`flex flex-col items-center gap-0.5 py-1 ${
            pathname.startsWith("/browse") ? "text-[#2874F0] font-semibold" : "text-[#535766]"
          }`}
        >
          <Compass className="h-5 w-5" />
          <span>Explore</span>
        </Link>

        <Link
          href="/wishlist"
          className={`flex flex-col items-center gap-0.5 py-1 ${
            pathname.startsWith("/wishlist") ? "text-[#2874F0] font-semibold" : "text-[#535766]"
          }`}
        >
          <Heart className="h-5 w-5" />
          <span>Wishlist</span>
        </Link>

        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-0.5 py-1 ${
            pathname.startsWith("/dashboard") ? "text-[#2874F0] font-semibold" : "text-[#535766]"
          }`}
        >
          <UserCheck className="h-5 w-5" />
          <span>Account</span>
        </Link>
      </div>
    </nav>
  );
}
