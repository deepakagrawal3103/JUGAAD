import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BRAND_CONFIG } from "@/config/brand";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  if (Number.isNaN(num)) return `${BRAND_CONFIG.currencySymbol}0`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: BRAND_CONFIG.currencyCode,
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}
