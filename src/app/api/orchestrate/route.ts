import { NextRequest, NextResponse } from "next/server";
import { getDashboardData, logTelemetry } from "@/lib/supabase";

export async function GET() {
  const data = await getDashboardData();
  return NextResponse.json({ ok: data.ok, queued: data.campaigns.filter((campaign) => campaign.status === "draft").length, timestamp: new Date().toISOString() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await logTelemetry({ source: "orchestrator", eventName: "orchestration_run", payload: { trigger: body.trigger || "manual" } });
  return NextResponse.json({ ok: true, mode: result.mode, message: "Orchestration run recorded.", telemetry: result.record ?? null });
}