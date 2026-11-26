import Link from "next/link";
import { notFound } from "next/navigation";
import { POLICY_LINKS } from "@/config/brand";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fallback = POLICY_LINKS.find((p) => p.slug === slug);

  let policy: { title: string; content_markdown: string; requires_legal_review: boolean } | null = null;

  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("policies")
      .select("title, content_markdown, requires_legal_review")
      .eq("slug", slug)
      .maybeSingle();
    if (data) policy = data;
  }

  if (!policy && fallback) {
    policy = {
      title: fallback.label,
      content_markdown: `This ${fallback.label} is an editable draft template configured in the Admin Console. Please review with business and legal counsel prior to production launch.`,
      requires_legal_review: true,
    };
  }

  if (!policy) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4DFD7] pb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8C857B]">Platform Governance</p>
          <h1 className="font-editorial text-4xl font-semibold text-[#161616]">{policy.title}</h1>
        </div>
        <Link href="/" className="text-xs uppercase tracking-widest text-[#57534E] underline">Back</Link>
      </div>

      {policy.requires_legal_review && (
        <div className="rounded-xl border border-[#E8D5B5] bg-[#FCF7EC] px-5 py-4 text-xs text-[#9A6B1E]">
          <strong>Draft Policy Notice:</strong> Editable operational draft requiring legal counsel review prior to launch.
        </div>
      )}

      <div className="rounded-2xl border border-[#E4DFD7] bg-white p-8 text-sm text-[#161616] leading-relaxed whitespace-pre-wrap">
        {policy.content_markdown}
      </div>
    </div>
  );
}
