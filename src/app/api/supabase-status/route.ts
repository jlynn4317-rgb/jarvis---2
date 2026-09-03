import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET() {
  const client = getSupabaseClient();

  if (!client) {
    return NextResponse.json({ ok: false, message: "Supabase client not configured." }, { status: 503 });
  }

  return NextResponse.json({ ok: true, message: "Supabase client initialized." });
}
