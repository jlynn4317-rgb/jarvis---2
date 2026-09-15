import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

export async function GET() {
  const client = getSupabaseServiceClient();
  if (!client) return NextResponse.json({ ok: false, message: "Supabase not configured." }, { status: 503 });
  const { data, error } = await client.from("agent_logs").select("*").order("created_at", { ascending: false }).limit(100);
  return NextResponse.json({ ok: !error, logs: data ?? [], error: error?.message });
}

export async function POST(request: NextRequest) {
  const client = getSupabaseServiceClient();
  if (!client) return NextResponse.json({ ok: false, message: "Supabase not configured." }, { status: 503 });
  const body = await request.json();
  const { data, error } = await client.from("agent_logs").insert({ agent: String(body.agent || "orchestrator"), action: String(body.action || "event"), message: String(body.message || ""), status: String(body.status || "success") }).select().single();
  return NextResponse.json({ ok: !error, log: data, error: error?.message }, { status: error ? 400 : 201 });
}