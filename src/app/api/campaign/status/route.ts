import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Hide ("paused") or restore ("active") a product on the link board. Owner login only,
// enforced by the proxy.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || "");
  const status = body?.status;

  if (!UUID.test(id) || (status !== "paused" && status !== "active")) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const client = getSupabaseServiceClient();
  if (!client) return NextResponse.json({ ok: false, error: "Temporarily unavailable." }, { status: 503 });

  const { error } = await client.from("campaigns").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: "Couldn't update that product." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
