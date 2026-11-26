import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { role } = await req.json();

    const users: Record<string, { userId: string; role: string; fullName: string; email: string; sellerProfileId: string | null }> = {
      ADMIN: {
        userId: "00000000-0000-0000-0000-000000000001",
        role: "ADMIN",
        fullName: "ClosetLoop Admin",
        email: "admin@closetloop.in",
        sellerProfileId: null,
      },
      SELLER: {
        userId: "00000000-0000-0000-0000-000000000002",
        role: "SELLER",
        fullName: "Riya Sharma",
        email: "seller@closetloop.in",
        sellerProfileId: "00000000-0000-0000-0000-000000000020",
      },
      CUSTOMER: {
        userId: "00000000-0000-0000-0000-000000000003",
        role: "CUSTOMER",
        fullName: "Aarav Mehta",
        email: "user@closetloop.in",
        sellerProfileId: null,
      },
    };

    const targetUser = users[role] || users.CUSTOMER;
    const res = NextResponse.json({ success: true, user: targetUser });

    // Store in cookie for local demo session
    res.cookies.set("closetloop_demo_session", JSON.stringify(targetUser), {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error setting session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("closetloop_demo_session");
  return res;
}
