"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { formatISTDateTime } from "@/lib/domain/dates";

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationsClient({ initialItems }: { initialItems: NotificationRow[] }) {
  const [items, setItems] = useState(initialItems);

  const markAllRead = async () => {
    await apiFetch("/api/customer/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await apiFetch("/api/customer/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  return (
    <div className="space-y-4">
      {items.some((i) => !i.is_read) && (
        <div className="flex justify-end">
          <Button variant="subtle" size="sm" onClick={markAllRead}>
            Mark All Read
          </Button>
        </div>
      )}

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-4 flex items-start justify-between gap-4 ${
                n.is_read ? "border-[#E4DFD7] bg-white" : "border-[#EB5E4C] bg-[#FDECE9]/40"
              }`}
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#161616]">{n.title}</p>
                <p className="text-xs text-[#57534E]">{n.body}</p>
                <p className="text-[11px] text-[#8C857B]">{formatISTDateTime(n.created_at)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {n.link && <Link href={n.link} className="text-xs underline">Open</Link>}
                {!n.is_read && (
                  <button type="button" onClick={() => markRead(n.id)} className="text-xs text-[#57534E] hover:text-[#161616]">
                    Done
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#D6CFC5] bg-white p-12 text-center text-sm text-[#8C857B]">
          No notifications yet.
        </div>
      )}
    </div>
  );
}
