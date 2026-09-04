import { NextResponse } from "next/server";
import { getRuntimeStatus } from "@/lib/jarvis";

export async function GET() {
  const runtime = getRuntimeStatus();

  return NextResponse.json({
    ok: true,
    integrations: {
      gemini: runtime.gemini,
      supabase: runtime.supabase,
      openai: runtime.openai,
      resend: runtime.resend,
    },
  });
}
