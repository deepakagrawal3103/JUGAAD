"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

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

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-2xl border border-[#E4DFD7] bg-white p-8 space-y-6">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Marketplace Mein Aao</p>
          <h1 className="font-editorial text-3xl font-semibold text-[#161616]">Account Banao</h1>
        </div>
        {error && <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] px-4 py-3 text-xs text-[#9E2A2B]">{error}</div>}
        {message && <div className="rounded-xl border border-[#C4DACB] bg-[#EDF5F0] px-4 py-3 text-xs text-[#2F5D46]">{message}</div>}
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
