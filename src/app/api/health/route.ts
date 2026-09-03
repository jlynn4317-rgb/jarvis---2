import { NextResponse } from "next/server";
import { getRuntimeStatus } from "@/lib/jarvis";

export async function GET() {
  return NextResponse.json({
    ok: true,
    runtime: getRuntimeStatus(),
    timestamp: new Date().toISOString(),
  });
}
