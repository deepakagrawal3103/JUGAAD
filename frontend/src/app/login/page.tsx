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
    if (!isSupabaseConfigured()) {
      setError("Supabase environment variables are not configured yet in frontend/.env.local.");
      return;
    }

    setLoading(true);
    try {
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Welcome Back</p>
          <h1 className="font-editorial text-3xl font-semibold text-[#161616]">Sign In</h1>
        </div>
        {error && <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] px-4 py-3 text-xs text-[#9E2A2B]">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" />
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <Button type="submit" variant="accent" disabled={loading} className="w-full">
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </form>
        <div className="border-t border-[#E4DFD7] pt-5 text-sm text-[#57534E] text-center">
          New here?{" "}
          <Link href={`/register?redirect=${encodeURIComponent(redirectTo)}`} className="font-semibold text-[#161616] underline">
            Create an Account
          </Link>
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
