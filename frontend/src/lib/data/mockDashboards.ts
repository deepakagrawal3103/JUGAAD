export const MOCK_CUSTOMER_BOOKINGS = [
  {
    id: "mock-booking-001",
    booking_reference: "CL-2026-PUN-091",
    status: "RENTAL_ACTIVE",
    payment_status: "VERIFIED",
    total_rental_amount: 3600,
    total_security_deposit: 2500,
    total_payable: 6100,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    items: [
      {
        id: "item-001",
        product_title_snapshot: "Sage Green Embroidered Sangeet Lehenga",
        product_image_snapshot: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
        start_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
        end_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        return_deadline: new Date(Date.now() + 86400000 * 2 + 1000 * 60 * 60 * 12).toISOString(),
      },
    ],
    security_deposit: {
      status: "HELD",
      amount_held: 2500,
      refund_amount: 0,
      deduction_amount: 0,
    },
  },
  {
    id: "mock-booking-002",
    booking_reference: "CL-2026-PUN-084",
    status: "PAYMENT_VERIFICATION_PENDING",
    payment_status: "VERIFICATION_PENDING",
    total_rental_amount: 1650,
    total_security_deposit: 1000,
    total_payable: 2650,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    items: [
      {
        id: "item-002",
        product_title_snapshot: "Maroon Banarasi Silk Saree",
        product_image_snapshot: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
        start_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
        end_date: new Date(Date.now() + 86400000 * 6).toISOString().split("T")[0],
        return_deadline: new Date(Date.now() + 86400000 * 6 + 1000 * 60 * 60 * 12).toISOString(),
      },
    ],
    security_deposit: {
      status: "AWAITING_PAYMENT",
      amount_held: 0,
      refund_amount: 0,
      deduction_amount: 0,
    },
  },
  {
    id: "mock-booking-003",
    booking_reference: "CL-2026-PUN-072",
    status: "COMPLETED",
    payment_status: "VERIFIED",
    total_rental_amount: 1350,
    total_security_deposit: 900,
    total_payable: 2250,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    items: [
      {
        id: "item-003",
        product_title_snapshot: "Charcoal Wool Tailored Blazer",
        product_image_snapshot: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80",
        start_date: new Date(Date.now() - 86400000 * 8).toISOString().split("T")[0],
        end_date: new Date(Date.now() - 86400000 * 5).toISOString().split("T")[0],
        return_deadline: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ],
    security_deposit: {
      status: "REFUNDED",
      amount_held: 0,
      refund_amount: 900,
      deduction_amount: 0,
    },
  },
];

export const MOCK_SELLER_LISTINGS = [
  {
    id: "mock-prod-001",
    title: "Sage Green Embroidered Sangeet Lehenga",
    slug: "sage-green-embroidered-sangeet-lehenga",
    brand: "Sabyasachi Heritage",
    size: "M",
    daily_price: 1200,
    security_deposit: 2500,
    status: "APPROVED" as const,
    admin_feedback: null,
    rental_count: 5,
    images: [
      {
        public_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
        is_primary: true,
      },
    ],
  },
  {
    id: "mock-prod-002",
    title: "Maroon Banarasi Silk Zari Saree",
    slug: "maroon-banarasi-silk-zari-saree",
    brand: "Raw Mango",
    size: "Free Size",
    daily_price: 550,
    security_deposit: 1000,
    status: "PENDING_REVIEW" as const,
    admin_feedback: "Awaiting admin curation review",
    rental_count: 0,
    images: [
      {
        public_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
        is_primary: true,
      },
    ],
  },
  {
    id: "mock-prod-003",
    title: "Charcoal Italian Wool Tailored Blazer",
    slug: "charcoal-italian-wool-tailored-blazer",
    brand: "Raymond Made-to-Measure",
    size: "M",
    daily_price: 450,
    security_deposit: 900,
    status: "APPROVED" as const,
    admin_feedback: null,
    rental_count: 8,
    images: [
      {
        public_url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80",
        is_primary: true,
      },
    ],
  },
  {
    id: "mock-prod-004",
    title: "Mustard Georgette Anarkali Gown",
    slug: "mustard-georgette-anarkali-gown",
    brand: "Ritu Kumar",
    size: "S",
    daily_price: 700,
    security_deposit: 1400,
    status: "CHANGES_REQUESTED" as const,
    admin_feedback: "Please add 1 more clear photo of the back embroidery.",
    rental_count: 2,
    images: [
      {
        public_url: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=800&q=80",
        is_primary: true,
      },
    ],
  },
];

export const MOCK_SELLER_BOOKING_ITEMS = [
  {
    id: "mock-bi-001",
    booking_id: "mock-booking-001",
    product_title_snapshot: "Sage Green Embroidered Sangeet Lehenga",
    start_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    end_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    rental_amount: 3600,
    commission_amount: 1080,
    seller_earnings: 2520,
    fulfillment_type: "DOORSTEP_DELIVERY",
    return_deadline: new Date(Date.now() + 86400000 * 2 + 1000 * 60 * 60 * 12).toISOString(),
    booking: {
      id: "mock-booking-001",
      booking_reference: "CL-2026-PUN-091",
      status: "RENTAL_ACTIVE",
      payment_status: "VERIFIED",
    },
  },
  {
    id: "mock-bi-002",
    booking_id: "mock-booking-003",
    product_title_snapshot: "Charcoal Wool Tailored Blazer",
    start_date: new Date(Date.now() - 86400000 * 8).toISOString().split("T")[0],
    end_date: new Date(Date.now() - 86400000 * 5).toISOString().split("T")[0],
    rental_amount: 1350,
    commission_amount: 405,
    seller_earnings: 945,
    fulfillment_type: "SELF_PICKUP",
    return_deadline: new Date(Date.now() - 86400000 * 5).toISOString(),
    booking: {
      id: "mock-booking-003",
      booking_reference: "CL-2026-PUN-072",
      status: "COMPLETED",
      payment_status: "VERIFIED",
    },
  },
];

export const MOCK_SELLER_PAYOUTS = [
  {
    id: "payout-001",
    amount: 945,
    status: "PAID",
    payout_reference: "UPI/3321948190/LENDER",
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: "payout-002",
    amount: 2520,
    status: "PENDING",
    payout_reference: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const MOCK_ADMIN_METRICS = {
  totalUsers: 142,
  totalSellers: 38,
  activeListings: 46,
  pendingListings: 3,
  totalBookings: 68,
  confirmedBookings: 54,
  activeRentals: 9,
  paymentPendingCount: 2,
  rentalVolume: 184500,
  platformCommission: 55350,
  sellerEarnings: 129150,
  refundsPending: 2,
  depositsHeld: 32500,
  returnsPending: 4,
  openDisputes: 1,
};

export const MOCK_ADMIN_PAYMENT_QUEUE = [
  {
    id: "pay-q-001",
    booking_id: "mock-booking-002",
    utr_reference: "329841029481",
    paid_amount: 2650,
    screenshot_path: "payment-proofs/sample-upi-receipt.png",
    review_status: "PENDING",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    booking: {
      id: "mock-booking-002",
      booking_reference: "CL-2026-PUN-084",
      total_payable: 2650,
      status: "PAYMENT_VERIFICATION_PENDING",
      customer: { email: "aarav.mehta@gmail.com" },
    },
  },
];

export const MOCK_ADMIN_LISTINGS = [
  {
    id: "mock-prod-002",
    title: "Maroon Banarasi Silk Zari Saree",
    brand: "Raw Mango",
    daily_price: 550,
    security_deposit: 1000,
    condition: "LIKE_NEW",
    status: "PENDING_REVIEW",
    is_featured: false,
    is_trending: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    category: { name: "Sarees" },
    seller: { display_name: "Priya's Closet", city: "Pune" },
    images: [{ public_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80", is_primary: true }],
  },
  {
    id: "mock-prod-004",
    title: "Mustard Georgette Anarkali Gown",
    brand: "Ritu Kumar",
    daily_price: 700,
    security_deposit: 1400,
    condition: "GENTLY_USED",
    status: "CHANGES_REQUESTED",
    is_featured: false,
    is_trending: false,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    category: { name: "Gowns & Dresses" },
    seller: { display_name: "Priya's Closet", city: "Pune" },
    images: [{ public_url: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=800&q=80", is_primary: true }],
  },
  {
    id: "mock-prod-001",
    title: "Sage Green Embroidered Sangeet Lehenga",
    brand: "Sabyasachi Heritage",
    daily_price: 1200,
    security_deposit: 2500,
    condition: "LIKE_NEW",
    status: "APPROVED",
    is_featured: true,
    is_trending: true,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    category: { name: "Lehengas" },
    seller: { display_name: "Priya's Closet", city: "Pune" },
    images: [{ public_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80", is_primary: true }],
  },
];

export const MOCK_ADMIN_BOOKINGS = [
  {
    id: "mock-booking-001",
    booking_reference: "CL-2026-PUN-091",
    status: "RENTAL_ACTIVE",
    payment_status: "VERIFIED",
    total_payable: 6100,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    customer: { email: "aarav.mehta@gmail.com" },
    items: [{ product_title_snapshot: "Sage Green Embroidered Sangeet Lehenga", start_date: new Date(Date.now() - 86400000).toISOString().split("T")[0], end_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0] }],
  },
  {
    id: "mock-booking-002",
    booking_reference: "CL-2026-PUN-084",
    status: "PAYMENT_VERIFICATION_PENDING",
    payment_status: "VERIFICATION_PENDING",
    total_payable: 2650,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    customer: { email: "aarav.mehta@gmail.com" },
    items: [{ product_title_snapshot: "Maroon Banarasi Silk Saree", start_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0], end_date: new Date(Date.now() + 86400000 * 6).toISOString().split("T")[0] }],
  },
  {
    id: "mock-booking-003",
    booking_reference: "CL-2026-PUN-072",
    status: "COMPLETED",
    payment_status: "VERIFIED",
    total_payable: 2250,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    customer: { email: "sneha.joshi@gmail.com" },
    items: [{ product_title_snapshot: "Charcoal Wool Tailored Blazer", start_date: new Date(Date.now() - 86400000 * 8).toISOString().split("T")[0], end_date: new Date(Date.now() - 86400000 * 5).toISOString().split("T")[0] }],
  },
];

export const MOCK_ADMIN_DEPOSITS = [
  {
    id: "dep-001",
    booking_id: "mock-booking-001",
    amount_held: 2500,
    deduction_amount: 0,
    refund_amount: 0,
    status: "HELD",
    booking: { booking_reference: "CL-2026-PUN-091", status: "RENTAL_ACTIVE" },
  },
  {
    id: "dep-002",
    booking_id: "mock-booking-003",
    amount_held: 0,
    deduction_amount: 0,
    refund_amount: 900,
    status: "REFUNDED",
    booking: { booking_reference: "CL-2026-PUN-072", status: "COMPLETED" },
  },
];

export const MOCK_ADMIN_PAYOUTS = [
  {
    id: "payout-001",
    amount: 945,
    status: "PAID",
    payout_reference: "UPI/3321948190/LENDER",
    seller: { display_name: "Priya's Closet", payout_upi_id: "priya@paytm" },
    booking: { booking_reference: "CL-2026-PUN-072" },
  },
  {
    id: "payout-002",
    amount: 2520,
    status: "PENDING",
    payout_reference: null,
    seller: { display_name: "Priya's Closet", payout_upi_id: "priya@paytm" },
    booking: { booking_reference: "CL-2026-PUN-091" },
  },
];

export const MOCK_ADMIN_DISPUTES = [
  {
    id: "dispute-001",
    dispute_type: "ITEM_NOT_AS_DESCRIBED",
    status: "OPEN",
    description: "Customer ne bola ki Lehenga ka color photo se alag dikh raha tha, exchange ya partial refund chahiye.",
    booking: { booking_reference: "CL-2026-PUN-091" },
  },
];

export const MOCK_ADMIN_USERS = [
  { id: "usr-001", email: "aarav.mehta@gmail.com", role: "CUSTOMER", status: "ACTIVE" },
  { id: "usr-002", email: "sneha.joshi@gmail.com", role: "CUSTOMER", status: "ACTIVE" },
  { id: "usr-003", email: "seller@closetloop.in", role: "SELLER", status: "ACTIVE" },
  { id: "usr-004", email: "admin@closetloop.in", role: "ADMIN", status: "ACTIVE" },
  { id: "usr-005", email: "rahul.test@gmail.com", role: "CUSTOMER", status: "SUSPENDED" },
];

export const MOCK_ADMIN_SELLERS = [
  {
    id: "sel-001",
    display_name: "Priya's Closet",
    city: "Pune",
    locality: "Koregaon Park",
    verification_status: "VERIFIED",
    payout_upi_id: "priya@paytm",
    total_rentals: 18,
    rating_avg: 4.9,
  },
  {
    id: "sel-002",
    display_name: "Royal Attire Studio",
    city: "Mumbai",
    locality: "Bandra West",
    verification_status: "PENDING",
    payout_upi_id: "royalattire@okicici",
    total_rentals: 0,
    rating_avg: 0,
  },
  {
    id: "sel-003",
    display_name: "Meera Designer Rentals",
    city: "Delhi",
    locality: "Hauz Khas",
    verification_status: "VERIFIED",
    payout_upi_id: "meera@ybl",
    total_rentals: 11,
    rating_avg: 4.7,
  },
];

export const MOCK_ADMIN_POLICIES = [
  {
    id: "pol-001",
    slug: "rental-policy",
    title: "Rental Policy",
    content_markdown: "# Rental Policy\n\nSabhi kapde dry-cleaned aur quality check ke baad bheje jaate hain. Return time par na hone par daily late fee lagegi.",
    requires_legal_review: true,
  },
  {
    id: "pol-002",
    slug: "security-deposit-policy",
    title: "Security Deposit Policy",
    content_markdown: "# Security Deposit Policy\n\nSecurity deposit 100% refundable hai. Kapde sahi salamat wapas aane par 24-48 ghante mein UPI se refund hota hai.",
    requires_legal_review: true,
  },
  {
    id: "pol-003",
    slug: "cancellation-policy",
    title: "Cancellation Policy",
    content_markdown: "# Cancellation Policy\n\nRental start date se 48 ghante pehle cancel karne par full refund milta hai.",
    requires_legal_review: true,
  },
];
