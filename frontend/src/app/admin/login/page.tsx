"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeInternalRedirect } from "@/lib/auth/redirect";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeInternalRedirect(searchParams.get("redirect"), "/admin");
  const unauthorized = searchParams.get("error") === "unauthorized";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    unauthorized ? "Only Admin accounts can sign in to this portal." : null
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured() && process.env.NEXT_PUBLIC_ENABLE_LOCAL_DEMO_AUTH !== "true") {
        setError("Admin sign-in is not configured yet.");
        return;
      }
      if (!isSupabaseConfigured()) {
        const res = await fetch("/api/auth/demo-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "ADMIN" }),
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
      <div className="rounded-2xl border border-[#161616] bg-white p-8 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FDECE9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D94E3D]">
            <ShieldCheck className="h-3.5 w-3.5" /> Protected Operations
          </div>
          <h1 className="font-editorial text-3xl font-semibold text-[#161616]">Admin Console Login</h1>
          <p className="text-xs text-[#57534E]">This private portal is strictly for platform owners and administrators.</p>
        </div>

        {error && <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] px-4 py-3 text-xs text-[#9E2A2B]">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin Email" />
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <Button type="submit" variant="accent" disabled={loading} className="w-full">
            {loading ? "Verifying..." : "Open Admin Panel"}
          </Button>
        </form>

      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-16 text-sm text-[#8C857B]">Loading...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
