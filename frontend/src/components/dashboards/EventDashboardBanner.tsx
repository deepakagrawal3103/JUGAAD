"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays, Sparkles } from "lucide-react";

type DashboardRole = "participant" | "seller" | "admin";

const content: Record<DashboardRole, { eyebrow: string; title: string; body: string; action: string; href?: string }> = {
  participant: {
    eyebrow: "BGI TIMELAPSE · 28–29 NOV",
    title: "Event ka look. Rent par, bina guesswork.",
    body: "Outfit ka rent, refundable security deposit, aur booking status ek jagah dekhein.",
    action: "Event looks browse karein",
    href: "/browse?occasion=College%20%26%20Fest",
  },
  seller: {
    eyebrow: "SELLER STUDIO · BGI TIMELAPSE",
    title: "Apne outfits ko campus closet mein laayein.",
    body: "Rent aur deposit set karein, dates manage karein, aur confirmed handovers yahin track karein.",
    action: "Outfit list karein",
    href: "/seller/listings/new",
  },
  admin: {
    eyebrow: "EVENT CONTROL · BGI TIMELAPSE",
    title: "Approvals, UPI checks, handovers.",
    body: "Pehle seller aur listing approvals clear karein; payment proof verify karke booking confirm karein.",
    action: "Pending approvals dekhein",
  },
};

export function EventDashboardBanner({ role, onAction }: { role: DashboardRole; onAction?: () => void }) {
  const item = content[role];
  const actionClass = "inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#161616] transition hover:bg-[#FDECE9]";

  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-[#2D2926] bg-[#211F1D] p-5 text-white shadow-sm sm:p-7">
      <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-2 -top-10 h-36 w-36 rounded-full border border-white/10" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F1B5AA]">
            <Sparkles className="h-3.5 w-3.5" /> {item.eyebrow}
          </div>
          <h2 className="font-editorial text-3xl font-semibold leading-tight sm:text-4xl">{item.title}</h2>
          <p className="max-w-xl text-sm leading-relaxed text-white/70">{item.body}</p>
          <p className="inline-flex items-center gap-1.5 text-[11px] text-white/55">
            <CalendarDays className="h-3.5 w-3.5" /> Bhopal · 28 Nov &nbsp; / &nbsp; Indore · 29 Nov
          </p>
        </div>
        {item.href ? (
          <Link className={actionClass} href={item.href}>
            {item.action} <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : (
          <button className={actionClass} onClick={onAction} type="button">
            {item.action} <ArrowUpRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}
