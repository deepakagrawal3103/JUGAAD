"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
  Bell,
  ChevronDown,
  MapPin,
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
  const [cityFilter, setCityFilter] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (cityFilter) params.set("location", cityFilter);
    const qs = params.toString();
    router.push(qs ? `/browse?${qs}` : "/browse");
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E4DFD7] bg-[#FAF8F5]/95 backdrop-blur-sm">
      <div className="border-b border-[#E4DFD7] bg-[#161616] text-[#FAF8F5] text-[11px] tracking-[0.08em] uppercase py-1.5 px-4 text-center">
        Dry-Cleaned &amp; Verified Kapde · 100% Refundable Security Deposit · Instant Booking
      </div>

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 sm:gap-4">
          {/* Left: Mobile toggle + Brand + City selector pill */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-[#161616]"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link
              href="/"
              className="font-editorial text-2xl sm:text-3xl font-semibold tracking-tight text-[#161616]"
            >
              {brandName}
            </Link>

            <div className="hidden sm:flex items-center gap-1 rounded-full border border-[#E4DFD7] bg-white px-3 py-1 text-xs text-[#161616]">
              <MapPin className="h-3.5 w-3.5 text-[#EB5E4C]" />
              <select
                aria-label="Filter by city"
                value={cityFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setCityFilter(val);
                  router.push(val ? `/browse?location=${encodeURIComponent(val)}` : "/browse");
                }}
                className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="">All Cities</option>
                <option value="Pune">Pune</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Hyderabad">Hyderabad</option>
              </select>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6 text-sm">
            <Link href="/browse" className="text-[#161616] hover:text-[#EB5E4C] transition-colors font-medium">
              Explore Rentals
            </Link>
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 text-[#161616] hover:text-[#EB5E4C] transition-colors font-medium py-2"
              >
                Categories <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 absolute left-0 top-full w-[420px] rounded-2xl border border-[#E4DFD7] bg-white p-5 grid grid-cols-2 gap-x-6 gap-y-2 shadow-sm">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/browse?category=${encodeURIComponent(cat.slug)}`}
                    className="text-sm text-[#57534E] hover:text-[#161616] py-1 transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          {/* Desktop Rounded Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xs lg:max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C857B]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sarees, lehengas, blazers..."
                className="w-full h-10 rounded-full border border-[#E4DFD7] bg-[#F3EFEA]/70 pl-10 pr-4 text-sm text-[#161616] placeholder:text-[#8C857B] focus:bg-white focus:outline-none focus:border-[#161616]"
              />
            </div>
          </form>

          {/* Right Utility Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {user && (
              <Link
                href="/dashboard/notifications"
                className="relative p-2 rounded-full text-[#161616] hover:bg-[#F3EFEA] transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {counts.unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 h-4 min-w-4 rounded-full px-1 bg-[#EB5E4C] text-white text-[10px] flex items-center justify-center">
                    {counts.unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            <Link
              href="/wishlist"
              className="relative p-2 rounded-full text-[#161616] hover:bg-[#F3EFEA] transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {counts.wishlist > 0 && (
                <span className="absolute top-1 right-1 h-4 min-w-4 rounded-full px-1 bg-[#161616] text-white text-[10px] flex items-center justify-center">
                  {counts.wishlist}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              className="relative p-2 rounded-full text-[#161616] hover:bg-[#F3EFEA] transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {counts.cart > 0 && (
                <span className="absolute top-1 right-1 h-4 min-w-4 rounded-full px-1 bg-[#EB5E4C] text-white text-[10px] flex items-center justify-center">
                  {counts.cart}
                </span>
              )}
            </Link>

            {user ? (
              <Link
                href={
                  user.role === "ADMIN"
                    ? "/admin"
                    : user.role === "SELLER"
                    ? "/seller"
                    : "/dashboard"
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E4DFD7] bg-white px-3.5 py-1.5 text-xs font-medium text-[#161616] hover:border-[#161616] transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{user.fullName.split(" ")[0]}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center rounded-full bg-[#161616] text-[#FAF8F5] px-4 py-2 text-xs font-medium hover:bg-[#2E2E2E] transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Search Bar directly under header row (matches Stitch mobile layout) */}
        <form onSubmit={handleSearch} className="md:hidden pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C857B]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sarees, lehengas, blazers..."
              className="w-full h-10 rounded-full border border-[#E4DFD7] bg-[#F3EFEA]/80 pl-10 pr-4 text-sm text-[#161616] placeholder:text-[#8C857B] focus:bg-white focus:outline-none"
            />
          </div>
        </form>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E4DFD7] py-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link href="/browse" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">
                Explore Rentals
              </Link>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">
                My Rentals
              </Link>
            </div>
            <div className="pt-2 border-t border-[#E4DFD7]">
              <p className="text-[11px] uppercase tracking-widest text-[#8C857B] mb-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/browse?category=${encodeURIComponent(cat.slug)}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-full border border-[#E4DFD7] bg-white px-3 py-1 text-xs text-[#57534E]"
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
