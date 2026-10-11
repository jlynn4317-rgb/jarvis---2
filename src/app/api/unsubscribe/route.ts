import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { verifyEmailToken } from "@/lib/unsubscribe";

// Accepts POST with ?e=<email>&t=<signature>. Mail apps' one-click unsubscribe
// POSTs to the URL in the List-Unsubscribe header, and the /unsubscribe page does too.
export async function POST(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get("e") || "").trim().toLowerCase();
  const token = req.nextUrl.searchParams.get("t") || "";

  if (!verifyEmailToken(email, token)) {
    return NextResponse.json({ ok: false, error: "This unsubscribe link isn't valid." }, { status: 400 });
  }

  const client = getSupabaseServiceClient();
  if (!client) return NextResponse.json({ ok: false, error: "Temporarily unavailable." }, { status: 503 });

  const { error } = await client.from("leads").update({ unsubscribed_at: new Date().toISOString() }).eq("email", email);
  if (error) return NextResponse.json({ ok: false, error: "Temporarily unavailable." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
