"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeInternalRedirect } from "@/lib/auth/redirect";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeInternalRedirect(searchParams.get("redirect"));

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!isSupabaseConfigured()) {
      setError("Supabase environment variables are not configured yet in frontend/.env.local.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim(), phone: phone.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        router.push(redirectTo);
        router.refresh();
      } else {
        setMessage("Apna inbox check karo — email verify karo, phir sign in karo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        const res = await fetch("/api/auth/demo-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "CUSTOMER" }),
        });
        if (res.ok) {
          router.push(redirectTo);
          router.refresh();
          return;
        }
      }
      const supabase = createClient();
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (oauthErr) setError(oauthErr.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-2xl border border-[#E4DFD7] bg-white p-8 space-y-6">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Marketplace Mein Aao</p>
          <h1 className="font-editorial text-3xl font-semibold text-[#161616]">Account Banao</h1>
        </div>
        {error && <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] px-4 py-3 text-xs text-[#9E2A2B]">{error}</div>}
        {message && <div className="rounded-xl border border-[#C4DACB] bg-[#EDF5F0] px-4 py-3 text-xs text-[#2F5D46]">{message}</div>}

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full h-11 rounded-xl border border-[#E4DFD7] bg-white hover:border-[#161616] flex items-center justify-center gap-2.5 text-sm font-medium text-[#161616] transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#E4DFD7] w-full" />
          <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-[#8C857B]">ya Email se</span>
          <div className="border-t border-[#E4DFD7] w-full" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Poora Naam" />
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" />
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number (Optional)" />
          <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (kam se kam 8 chars)" />
          <Button type="submit" variant="accent" disabled={loading} className="w-full">
            {loading ? "Account Ban Raha Hai..." : "Account Banao"}
          </Button>
        </form>
        <div className="border-t border-[#E4DFD7] pt-5 text-sm text-[#57534E] text-center">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#161616] underline">
            Sign In Karo
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-16 text-sm text-[#8C857B]">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
