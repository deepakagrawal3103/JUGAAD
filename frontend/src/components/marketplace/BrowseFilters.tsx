"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GENDER_STYLES, OCCASIONS, PRODUCT_CONDITIONS, SIZES } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CategoryRecord } from "@/types/database";

export function QuickFilterStrip() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeOccasion = searchParams.get("occasion") || "";
  const activeMax = searchParams.get("max_price") || "";

  const pushQuick = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!val || params.get(key) === val) params.delete(key);
    else params.set(key, val);
    router.push(`/browse?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
      <button
        type="button"
        onClick={() => router.push("/browse")}
        className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium border transition-colors ${
          !activeOccasion && !activeMax
            ? "bg-[#FDECE9] border-[#F7C9C3] text-[#D94E3D]"
            : "bg-white border-[#E4DFD7] text-[#57534E]"
        }`}
      >
        All
      </button>
      {OCCASIONS.slice(0, 4).map((occ) => (
        <button
          key={occ}
          type="button"
          onClick={() => pushQuick("occasion", occ)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium border transition-colors ${
            activeOccasion === occ
              ? "bg-[#FDECE9] border-[#F7C9C3] text-[#D94E3D]"
              : "bg-white border-[#E4DFD7] text-[#57534E]"
          }`}
        >
          {occ}
        </button>
      ))}
      <button
        type="button"
        onClick={() => pushQuick("max_price", "800")}
        className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium border transition-colors ${
          activeMax === "800"
            ? "bg-[#FDECE9] border-[#F7C9C3] text-[#D94E3D]"
            : "bg-white border-[#E4DFD7] text-[#57534E]"
        }`}
      >
        Under ₹800/day
      </button>
    </div>
  );
}

export function BrowseFilters({ categories }: { categories: CategoryRecord[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [subcategory, setSubcategory] = useState(searchParams.get("subcategory") || "");
  const [size, setSize] = useState(searchParams.get("size") || "");
  const [genderStyle, setGenderStyle] = useState(searchParams.get("gender_style") || "");
  const [occasion, setOccasion] = useState(searchParams.get("occasion") || "");
  const [color, setColor] = useState(searchParams.get("color") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [condition, setCondition] = useState(searchParams.get("condition") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");
  const [duration, setDuration] = useState(searchParams.get("duration") || "");
  const [startDate, setStartDate] = useState(searchParams.get("start_date") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end_date") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "recommended");

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (subcategory.trim()) params.set("subcategory", subcategory.trim());
    if (size) params.set("size", size);
    if (genderStyle) params.set("gender_style", genderStyle);
    if (occasion) params.set("occasion", occasion);
    if (color.trim()) params.set("color", color.trim());
    if (location.trim()) params.set("location", location.trim());
    if (condition) params.set("condition", condition);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (duration) params.set("duration", duration);
    if (startDate && endDate) {
      params.set("start_date", startDate);
      params.set("end_date", endDate);
    }
    if (sort && sort !== "recommended") params.set("sort", sort);
    router.push(`/browse?${params.toString()}`);
  };

  return (
    <form onSubmit={applyFilters} className="rounded-2xl border border-[#E4DFD7] bg-white p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[#E4DFD7] pb-3">
        <h2 className="font-editorial text-xl font-semibold text-[#161616]">Refine Search</h2>
        <button
          type="button"
          onClick={() => router.push("/browse")}
          className="text-xs text-[#EB5E4C] font-medium hover:underline"
        >
          Reset
        </button>
      </div>

      <div className="space-y-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or brand..." />

        <Select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recommended">Recommended</option>
          <option value="newly_added">Newly Added</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="most_popular">Most Popular</option>
        </Select>

        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </Select>

        <Input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="Subcategory (e.g. Anarkali)" />

        <div className="grid grid-cols-2 gap-2">
          <Select value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">Any Size</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select value={genderStyle} onChange={(e) => setGenderStyle(e.target.value)}>
            <option value="">All Styles</option>
            {GENDER_STYLES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
        </div>

        <Select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
          <option value="">All Occasions</option>
          {OCCASIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color" />
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City" />
        </div>

        <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option value="">Any Condition</option>
          {PRODUCT_CONDITIONS.map((cond) => (
            <option key={cond.value} value={cond.value}>{cond.label}</option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={0} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min ₹/day" />
          <Input type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max ₹/day" />
        </div>

        <Input type="number" min={1} max={90} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration (days)" />

        <div className="pt-2 border-t border-[#E4DFD7] space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-[#57534E] block">
            Available For Dates
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      <Button type="submit" variant="accent" className="w-full">
        Apply Filters
      </Button>
    </form>
  );
}
