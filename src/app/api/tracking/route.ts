import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const client = getSupabaseServiceClient();
  if (!client) return NextResponse.json({ ok: false, message: "Supabase not configured." }, { status: 503 });
  const body = await request.json();
  const slug = String(body.slug || crypto.randomUUID().replaceAll("-", "").slice(0, 10));
  const { data, error } = await client.from("tracking_links").insert({ slug, campaign_id: body.campaignId || null, destination: String(body.destination || "") }).select().single();
  return NextResponse.json({ ok: !error, link: data, error: error?.message }, { status: error ? 400 : 201 });
}