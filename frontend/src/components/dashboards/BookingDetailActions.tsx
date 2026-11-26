"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";

export function BookingDetailActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeType, setDisputeType] = useState("INCORRECT_PRODUCT");
  const [disputeDesc, setDisputeDesc] = useState("");

  const triggerTransition = async (nextStatus: string, note?: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next_status: nextStatus, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/customer/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          dispute_type: disputeType,
          description: disputeDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit dispute.");
        return;
      }
      setDisputeOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-[#E6C5C5] bg-[#FDF1F1] p-3 text-xs text-[#9E2A2B]">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {["RENTAL_ACTIVE", "RETURN_DUE"].includes(status) && (
          <Button
            variant="accent"
            disabled={loading}
            onClick={() => triggerTransition("RETURN_INITIATED", "Customer initiated item return.")}
          >
            Initiate Return
          </Button>
        )}

        {["AWAITING_PAYMENT", "PAYMENT_VERIFICATION_PENDING", "CONFIRMED"].includes(status) && (
          <Button
            variant="destructive"
            disabled={loading}
            onClick={() => triggerTransition("CANCELLED", "Cancelled by customer")}
          >
            Cancel Booking
          </Button>
        )}

        {!["CANCELLED", "COMPLETED", "DISPUTED"].includes(status) && (
          <Button type="button" variant="subtle" onClick={() => setDisputeOpen(!disputeOpen)}>
            Report Issue / Dispute
          </Button>
        )}
      </div>

      {disputeOpen && (
        <form onSubmit={handleDispute} className="rounded-xl border border-[#E4DFD7] bg-[#FAF8F5] p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider">Open Support Dispute</h4>
          <Select value={disputeType} onChange={(e) => setDisputeType(e.target.value)}>
            <option value="INCORRECT_PRODUCT">Incorrect Product</option>
            <option value="DAMAGED_PRODUCT">Damaged on Arrival</option>
            <option value="PAYMENT_DISPUTE">Payment Dispute</option>
            <option value="REFUND_DISPUTE">Refund Dispute</option>
          </Select>
          <Textarea
            required
            value={disputeDesc}
            onChange={(e) => setDisputeDesc(e.target.value)}
            placeholder="Describe the issue clearly for admin review..."
          />
          <Button type="submit" variant="accent" disabled={loading} size="sm">
            Submit Dispute
          </Button>
        </form>
      )}
    </div>
  );
}
