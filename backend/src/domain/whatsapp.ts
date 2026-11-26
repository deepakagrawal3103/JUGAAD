export function normalizeWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function buildWhatsAppPaymentUrl(input: {
  whatsappNumber: string;
  bookingReference: string;
  customerName: string;
  amountPaid: number;
  utrReference: string;
}): string | null {
  const phone = normalizeWhatsAppNumber(input.whatsappNumber);
  if (!phone) return null;

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(input.amountPaid);

  const lines = [
    "Hello, I have made payment for my fashion rental booking.",
    "",
    `Booking ID: ${input.bookingReference}`,
    `Name: ${input.customerName}`,
    `Amount Paid: ₹${formattedAmount}`,
    `UTR/Reference: ${input.utrReference || "Submitted on portal"}`,
    "",
    "Please verify my payment.",
  ];

  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
}
