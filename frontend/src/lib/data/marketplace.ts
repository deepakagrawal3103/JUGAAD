import { BRAND_CONFIG } from "@/config/brand";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { AdminSettingsRecord, CategoryRecord, ProductWithRelations } from "@/types/database";

const FALLBACK_SETTINGS: AdminSettingsRecord = {
  id: 1,
  brand_name: BRAND_CONFIG.name,
  brand_tagline: BRAND_CONFIG.tagline,
  commission_percent: BRAND_CONFIG.defaultCommissionPercent,
  reservation_hold_minutes: BRAND_CONFIG.defaultReservationHoldMinutes,
  cleaning_buffer_days: BRAND_CONFIG.defaultCleaningBufferDays,
  late_fee_grace_hours: 4,
  late_fee_policy_summary:
    "3-Day Rental Policy: Aap event se 1 din pehle outfit pehen sakte hain aur 3rd day return karna zaroori hai. 3rd day ke baad har extra day par rent amount ka 30% late fee lagega.",
  upi_id: "",
  upi_display_name: `${BRAND_CONFIG.name} Rentals`,
  upi_qr_url: "",
  whatsapp_number: "",
  payment_instructions:
    "Scan the QR code or copy the UPI ID above to pay the exact total. Submit your UTR reference and screenshot below.",
};

const DEFAULT_CATEGORIES: CategoryRecord[] = [
  { id: "cat-1", name: "Dresses", slug: "dresses", display_order: 1, is_active: true },
  { id: "cat-2", name: "Ethnic Wear", slug: "ethnic-wear", display_order: 2, is_active: true },
  { id: "cat-3", name: "Sarees", slug: "sarees", display_order: 3, is_active: true },
  { id: "cat-4", name: "Lehenga", slug: "lehenga", display_order: 4, is_active: true },
  { id: "cat-5", name: "Shirts", slug: "shirts", display_order: 5, is_active: true },
  { id: "cat-6", name: "T-Shirts", slug: "t-shirts", display_order: 6, is_active: true },
  { id: "cat-7", name: "Pants", slug: "pants", display_order: 7, is_active: true },
  { id: "cat-8", name: "Trousers", slug: "trousers", display_order: 8, is_active: true },
  { id: "cat-9", name: "Jeans", slug: "jeans", display_order: 9, is_active: true },
  { id: "cat-10", name: "Jackets", slug: "jackets", display_order: 10, is_active: true },
  { id: "cat-11", name: "Blazers", slug: "blazers", display_order: 11, is_active: true },
  { id: "cat-12", name: "Shoes", slug: "shoes", display_order: 12, is_active: true },
  { id: "cat-13", name: "Sneakers", slug: "sneakers", display_order: 13, is_active: true },
  { id: "cat-14", name: "Accessories", slug: "accessories", display_order: 14, is_active: true },
];

export async function getPublicMarketplaceShellData() {
  if (!isSupabaseServerConfigured()) {
    return {
      configured: false,
      settings: FALLBACK_SETTINGS,
      categories: DEFAULT_CATEGORIES,
      userCounts: { wishlist: 0, cart: 0, unreadNotifications: 0 },
    };
  }

  const supabase = await createServerSupabase();
  const sessionUser = await getCurrentSessionUser();

  const [{ data: settingsData }, { data: categoriesData }] = await Promise.all([
    supabase.from("admin_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("categories").select("*").eq("is_active", true).order("display_order"),
  ]);

  const userCounts = { wishlist: 0, cart: 0, unreadNotifications: 0 };
  if (sessionUser) {
    const [{ data: wishlist }, { data: cart }, { count: notifCount }] = await Promise.all([
      supabase.from("wishlists").select("id").eq("user_id", sessionUser.userId).maybeSingle(),
      supabase.from("carts").select("id").eq("user_id", sessionUser.userId).maybeSingle(),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", sessionUser.userId)
        .eq("is_read", false),
    ]);

    if (wishlist) {
      const { count } = await supabase
        .from("wishlist_items")
        .select("id", { count: "exact", head: true })
        .eq("wishlist_id", wishlist.id);
      userCounts.wishlist = count ?? 0;
    }
    if (cart) {
      const { count } = await supabase
        .from("cart_items")
        .select("id", { count: "exact", head: true })
        .eq("cart_id", cart.id);
      userCounts.cart = count ?? 0;
    }
    userCounts.unreadNotifications = notifCount ?? 0;
  }

  return {
    configured: true,
    settings: (settingsData as AdminSettingsRecord | null) ?? FALLBACK_SETTINGS,
    categories:
      categoriesData && categoriesData.length > 0
        ? (categoriesData as CategoryRecord[])
        : DEFAULT_CATEGORIES,
    userCounts,
  };
}

export async function getHomepageData() {
  if (!isSupabaseServerConfigured()) {
    return {
      banners: [],
      featured: [] as ProductWithRelations[],
      trending: [] as ProductWithRelations[],
      recent: [] as ProductWithRelations[],
      wishlistProductIds: [] as string[],
    };
  }

  const supabase = await createServerSupabase();
  const sessionUser = await getCurrentSessionUser();
  const productSelect = `
    *,
    category:categories(id, name, slug),
    images:product_images(id, product_id, storage_path, public_url, angle_tag, sort_order, is_primary),
    seller:seller_profiles(id, display_name, city, locality, verification_status, total_rentals, rating_avg)
  `;

  const todayIST = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split("T")[0];
  const [{ data: banners }, { data: featured }, { data: trending }, { data: recent }, { data: activeRentItems }] =
    await Promise.all([
      supabase.from("banners").select("*").eq("is_active", true).order("display_order"),
      supabase
        .from("products")
        .select(productSelect)
        .eq("status", "APPROVED")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("products")
        .select(productSelect)
        .eq("status", "APPROVED")
        .eq("is_active", true)
        .eq("is_trending", true)
        .order("rental_count", { ascending: false })
        .limit(8),
      supabase
        .from("products")
        .select(productSelect)
        .eq("status", "APPROVED")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("booking_items")
        .select("product_id, booking:bookings!inner(status)")
        .in("booking.status", ["CONFIRMED", "READY_FOR_PICKUP", "DISPATCHED", "RENTAL_ACTIVE", "RETURN_DUE"])
        .lte("start_date", todayIST)
        .gte("end_date", todayIST),
    ]);

  const rentedTodayIds = new Set((activeRentItems ?? []).map((r: { product_id: string }) => r.product_id));
  const filterAvailable = (rows: unknown) =>
    ((rows as ProductWithRelations[]) ?? []).filter((p) => !rentedTodayIds.has(p.id));

  let wishlistProductIds: string[] = [];
  if (sessionUser) {
    const { data: wishlist } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", sessionUser.userId)
      .maybeSingle();
    if (wishlist) {
      const { data: wItems } = await supabase
        .from("wishlist_items")
        .select("product_id")
        .eq("wishlist_id", wishlist.id);
      wishlistProductIds = (wItems ?? []).map((w) => w.product_id);
    }
  }

  return {
    banners: banners ?? [],
    featured: filterAvailable(featured),
    trending: filterAvailable(trending),
    recent: filterAvailable(recent),
    wishlistProductIds,
  };
}
