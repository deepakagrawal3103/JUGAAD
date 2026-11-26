"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, LayoutGrid, Plus, Heart, Inbox } from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#E4DFD7] bg-[#FAF8F5]/95 backdrop-blur-sm px-3 py-1.5">
      <div className="grid grid-cols-5 items-center text-[11px]">
        <Link
          href="/browse"
          className={`flex flex-col items-center gap-0.5 py-1 ${
            pathname.startsWith("/browse") ? "text-[#EB5E4C] font-semibold" : "text-[#57534E]"
          }`}
        >
          <Compass className="h-5 w-5" />
          <span>Explore</span>
        </Link>

        <Link
          href="/#categories"
          className="flex flex-col items-center gap-0.5 py-1 text-[#57534E]"
        >
          <LayoutGrid className="h-5 w-5" />
          <span>Categories</span>
        </Link>

        <Link href="/seller/listings/new" className="flex flex-col items-center gap-0.5 -mt-4">
          <span className="h-11 w-11 rounded-full bg-[#EB5E4C] text-white flex items-center justify-center shadow-sm border-2 border-[#FAF8F5]">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-[#161616] font-medium">Rent Out</span>
        </Link>

        <Link
          href="/wishlist"
          className={`flex flex-col items-center gap-0.5 py-1 ${
            pathname.startsWith("/wishlist") ? "text-[#EB5E4C] font-semibold" : "text-[#57534E]"
          }`}
        >
          <Heart className="h-5 w-5" />
          <span>Saved</span>
        </Link>

        <Link
          href="/dashboard/notifications"
          className={`flex flex-col items-center gap-0.5 py-1 ${
            pathname.startsWith("/dashboard") ? "text-[#EB5E4C] font-semibold" : "text-[#57534E]"
          }`}
        >
          <Inbox className="h-5 w-5" />
          <span>Inbox</span>
        </Link>
      </div>
    </nav>
  );
}
