"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Heart,
  ShoppingCart,
  User,
  Menu,
  X,
  Bell,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import type { CategoryRecord } from "@/types/database";
import type { AuthenticatedContext } from "@/lib/auth/session";

interface SiteHeaderProps {
  brandName: string;
  categories: CategoryRecord[];
  user: AuthenticatedContext | null;
  counts: {
    wishlist: number;
    cart: number;
    unreadNotifications: number;
  };
}

export function SiteHeader({ brandName, categories, user, counts }: SiteHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    const qs = params.toString();
    router.push(qs ? `/browse?${qs}` : "/browse");
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#2874F0] text-white shadow-sm">
      <div className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-3 sm:gap-5">
          {/* Left: Mobile toggle + Flipkart-style Brand */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 -ml-1 text-white"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link href="/" className="flex flex-col leading-none group">
              <span className="text-xl sm:text-2xl font-bold italic tracking-tight text-white">
                {brandName}
              </span>
              <span className="text-[10px] italic text-[#F0F0F0] flex items-center gap-0.5 mt-0.5">
                Explore <span className="text-[#FFE500] font-semibold">Assured</span>
                <Sparkles className="h-2.5 w-2.5 text-[#FFE500]" />
              </span>
            </Link>
          </div>

          {/* Desktop Flipkart Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full flex">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for lehengas, sarees, blazers and more..."
                className="w-full h-9 rounded-l-sm bg-white pl-4 pr-3 text-sm text-[#212121] placeholder:text-[#878787] focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Search"
                className="h-9 px-4 rounded-r-sm bg-white text-[#2874F0] flex items-center justify-center border-l border-[#F0F0F0] hover:bg-[#F5F8FF]"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-semibold">
            <Link href="/browse" className="text-white hover:text-[#FFE500] transition-colors">
              Explore
            </Link>
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 text-white hover:text-[#FFE500] transition-colors py-2"
              >
                Categories <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 absolute left-0 top-full w-[420px] rounded-sm border border-[#E0E0E0] bg-white p-5 grid grid-cols-2 gap-x-6 gap-y-2 shadow-lg text-[#212121]">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/browse?category=${encodeURIComponent(cat.slug)}`}
                    className="text-sm font-medium text-[#535766] hover:text-[#2874F0] py-1 transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          {/* Right Utility Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {user ? (
              <Link
                href={
                  user.role === "ADMIN"
                    ? "/admin"
                    : user.role === "SELLER"
                    ? "/seller"
                    : "/dashboard"
                }
                className="inline-flex items-center gap-1.5 rounded-sm bg-white text-[#2874F0] px-3 sm:px-4 py-1.5 text-xs font-semibold hover:bg-[#F5F8FF] transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{user.fullName.split(" ")[0]}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center rounded-sm bg-white text-[#2874F0] px-4 sm:px-6 py-1.5 text-xs sm:text-sm font-semibold hover:bg-[#F5F8FF] transition-colors"
              >
                Login
              </Link>
            )}

            {user && (
              <Link
                href="/dashboard/notifications"
                className="relative p-1.5 text-white hover:text-[#FFE500] transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {counts.unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full px-1 bg-[#FFE500] text-[#212121] font-bold text-[10px] flex items-center justify-center">
                    {counts.unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            <Link
              href="/wishlist"
              className="relative p-1.5 text-white hover:text-[#FFE500] transition-colors flex items-center gap-1"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {counts.wishlist > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full px-1 bg-[#FFE500] text-[#212121] font-bold text-[10px] flex items-center justify-center">
                  {counts.wishlist}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              className="relative p-1.5 text-white hover:text-[#FFE500] transition-colors flex items-center gap-1.5 text-sm font-semibold"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden sm:inline">Bag</span>
              {counts.cart > 0 && (
                <span className="absolute -top-0.5 left-3.5 h-4 min-w-4 rounded-full px-1 bg-[#FFE500] text-[#212121] font-bold text-[10px] flex items-center justify-center">
                  {counts.cart}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar inside Flipkart Blue Header */}
        <form onSubmit={handleSearch} className="md:hidden pb-2.5">
          <div className="relative w-full flex">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#878787]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for outfits, brands and more..."
              className="w-full h-9 rounded-sm bg-white pl-9 pr-3 text-sm text-[#212121] placeholder:text-[#878787] focus:outline-none"
            />
          </div>
        </form>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/20 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
              <Link href="/browse" onClick={() => setMobileMenuOpen(false)} className="py-1.5 text-white">
                Explore Rentals
              </Link>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="py-1.5 text-white">
                My Bookings
              </Link>
            </div>
            <div className="pt-2 border-t border-white/20">
              <p className="text-[11px] uppercase tracking-widest text-white/80 mb-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/browse?category=${encodeURIComponent(cat.slug)}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-sm bg-white px-3 py-1 text-xs font-medium text-[#212121]"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
