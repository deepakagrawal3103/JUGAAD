import type { Metadata } from "next";
import "./globals.css";
import { BRAND_CONFIG } from "@/config/brand";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { getPublicMarketplaceShellData } from "@/lib/data/marketplace";
import { getCurrentSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: `${BRAND_CONFIG.name} — ${BRAND_CONFIG.tagline}`,
  description:
    "Peer-to-peer fashion rental marketplace for weddings, occasions, photoshoots, and everyday designer looks.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [shell, sessionUser] = await Promise.all([
    getPublicMarketplaceShellData(),
    getCurrentSessionUser(),
  ]);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#F1F3F6] text-[#212121]">
        <SiteHeader
          brandName={shell.settings.brand_name}
          categories={shell.categories}
          user={sessionUser}
          counts={shell.userCounts}
        />
        <main className="flex-1">{children}</main>
        <SiteFooter
          brandName={shell.settings.brand_name}
          brandTagline={shell.settings.brand_tagline}
        />
        <MobileBottomNav />
      </body>
    </html>
  );
}
