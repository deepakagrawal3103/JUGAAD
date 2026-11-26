"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Store } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeInternalRedirect } from "@/lib/auth/redirect";

function SellerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeInternalRedirect(searchParams.get("redirect"), "/seller");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        setError("Google sign-in is unavailable until Supabase is configured.");
        return;
      }
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
      });
      if (oauthError) setError(oauthError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured() && process.env.NEXT_PUBLIC_ENABLE_LOCAL_DEMO_AUTH !== "true") {
        setError("Account sign-in is not configured yet. Please try again later.");
        return;
      }
      if (!isSupabaseConfigured()) {
        const res = await fetch("/api/auth/demo-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "SELLER" }),
        });
        if (res.ok) {
          router.push(redirectTo);
          router.refresh();
          return;
        }
      }

      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) {
        setError(authError.message);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-2xl border border-[#C4DACB] bg-white p-8 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EDF5F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2F5D46]">
            <Store className="h-3.5 w-3.5" /> Seller Portal
          </div>
          <h1 className="font-editorial text-3xl font-semibold text-[#161616]">Seller Studio Sign In</h1>
          <p className="text-xs text-[#57534E]">Apne closet listings, bookings aur payouts manage karne ke liye login karo.</p>
        </div>

        {error && <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] px-4 py-3 text-xs text-[#9E2A2B]">{error}</div>}

        <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full h-11 rounded-xl border border-[#E4DFD7] bg-white hover:border-[#161616] text-sm font-medium text-[#161616] transition-colors">
          Continue with Google
        </button>
        <p className="text-center text-[11px] uppercase tracking-wider text-[#8C857B]">ya email se</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seller Email Daalo" />
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password Daalo" />
          <Button type="submit" variant="accent" disabled={loading} className="w-full">
            {loading ? "Login Ho Raha Hai..." : "Seller Studio Kholo"}
          </Button>
        </form>

        <div className="border-t border-[#E4DFD7] pt-4 text-xs text-[#57534E] text-center">
          Abhi Seller nahi bane?{" "}
            <Link href={`/register?redirect=${encodeURIComponent("/seller/apply")}`} className="font-semibold text-[#2F5D46] underline">
            Account banao / Seller onboarding
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function SellerLoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-16 text-sm text-[#8C857B]">Loading...</div>}>
      <SellerLoginForm />
    </Suspense>
  );
}
