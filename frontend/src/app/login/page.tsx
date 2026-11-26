"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        // Local Demo fallback: detect account by email
        let role = "CUSTOMER";
        if (email.includes("admin")) role = "ADMIN";
        else if (email.includes("seller")) role = "SELLER";

        const res = await fetch("/api/auth/demo-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });

        if (res.ok) {
          if (role === "ADMIN") router.push("/admin");
          else if (role === "SELLER") router.push("/seller");
          else router.push(redirectTo);
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
      <div className="rounded-2xl border border-[#E4DFD7] bg-white p-8 space-y-6">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Wapas Aaye? Swagat Hai!</p>
          <h1 className="font-editorial text-3xl font-semibold text-[#161616]">Sign In Karo</h1>
        </div>
        {error && <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] px-4 py-3 text-xs text-[#9E2A2B]">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Daalo" />
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password Daalo" />
          <Button type="submit" variant="accent" disabled={loading} className="w-full">
            {loading ? "Sign In Ho Raha Hai..." : "Sign In Karo"}
          </Button>
        </form>
        <div className="border-t border-[#E4DFD7] pt-5 text-sm text-[#57534E] text-center">
          New here?{" "}
          <Link href={`/register?redirect=${encodeURIComponent(redirectTo)}`} className="font-semibold text-[#161616] underline">
            Naya Account Banao
          </Link>
        </div>

        {/* Demo Sample Credentials */}
        <div className="rounded-xl border border-[#E4DFD7] bg-[#FAF8F5] p-4 text-xs space-y-2.5">
          <p className="font-semibold uppercase tracking-wider text-[#161616]">Sample Credentials (Testing ke liye)</p>
          <div className="space-y-1.5 text-[#57534E]">
            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-[#E4DFD7]">
              <div>
                <span className="font-semibold text-[#EB5E4C]">Admin:</span> admin@closetloop.in
              </div>
              <button
                type="button"
                onClick={() => { setEmail("admin@closetloop.in"); setPassword("Admin@123456"); }}
                className="text-[11px] font-medium text-[#161616] underline"
              >
                Auto-fill
              </button>
            </div>
            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-[#E4DFD7]">
              <div>
                <span className="font-semibold text-[#2F5D46]">Seller:</span> seller@closetloop.in
              </div>
              <button
                type="button"
                onClick={() => { setEmail("seller@closetloop.in"); setPassword("Seller@123456"); }}
                className="text-[11px] font-medium text-[#161616] underline"
              >
                Auto-fill
              </button>
            </div>
            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-[#E4DFD7]">
              <div>
                <span className="font-semibold text-[#161616]">Customer:</span> user@closetloop.in
              </div>
              <button
                type="button"
                onClick={() => { setEmail("user@closetloop.in"); setPassword("User@123456"); }}
                className="text-[11px] font-medium text-[#161616] underline"
              >
                Auto-fill
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-16 text-sm text-[#8C857B]">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
