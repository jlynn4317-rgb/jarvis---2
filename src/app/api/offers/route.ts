import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

export async function GET() {
  const client = getSupabaseServiceClient();
  if (!client) return NextResponse.json({ ok: false, message: "Supabase not configured." }, { status: 503 });
  const { data, error } = await client.from("offers").select("*").order("created_at", { ascending: false });
  return NextResponse.json({ ok: !error, offers: data ?? [], error: error?.message });
}

export async function POST(request: NextRequest) {
  const client = getSupabaseServiceClient();
  if (!client) return NextResponse.json({ ok: false, message: "Supabase not configured." }, { status: 503 });
  const body = await request.json();
  const { data, error } = await client.from("offers").insert({ name: String(body.name || "Untitled offer"), advertiser: String(body.advertiser || "Unknown"), category: String(body.category || "General"), payout: Number(body.payout || 0), status: body.status === "paused" ? "paused" : "active" }).select().single();
  return NextResponse.json({ ok: !error, offer: data, error: error?.message }, { status: error ? 400 : 201 });
}