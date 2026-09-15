import { NextRequest, NextResponse } from "next/server";
import { getDashboardData, getSupabaseServiceClient } from "@/lib/supabase";

export async function GET() {
  const data = await getDashboardData();
  return NextResponse.json({ ok: data.ok, campaigns: data.campaigns, offers: data.offers, telemetry: data.telemetry, generatedAt: new Date().toISOString() });
}

export async function POST(request: NextRequest) {
  const client = getSupabaseServiceClient();
  if (!client) return NextResponse.json({ ok: false, message: "Supabase not configured." }, { status: 503 });
  const body = await request.json();
  const { data, error } = await client.from("analytics_snapshots").insert({ period_start: body.periodStart || new Date(Date.now() - 86400000).toISOString(), period_end: body.periodEnd || new Date().toISOString(), spend: Number(body.spend || 0), revenue: Number(body.revenue || 0), roi: Number(body.roi || 0), epc: Number(body.epc || 0), cvr: Number(body.cvr || 0), clicks: Number(body.clicks || 0), conversions: Number(body.conversions || 0) }).select().single();
  return NextResponse.json({ ok: !error, snapshot: data, error: error?.message }, { status: error ? 400 : 201 });
}