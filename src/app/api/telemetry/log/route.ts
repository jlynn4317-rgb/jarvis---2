import { NextRequest, NextResponse } from "next/server";
import { logTelemetry } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source = "jarvis", eventName = "event", payload = {}, userId } = body ?? {};

    const result = await logTelemetry({
      userId: userId ? String(userId) : undefined,
      source: String(source),
      eventName: String(eventName),
      payload: payload && typeof payload === "object" ? payload : {},
    });

    return NextResponse.json({
      ok: result.ok,
      mode: result.mode,
      message: result.ok ? "Telemetry recorded." : result.message,
      record: result.record ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
