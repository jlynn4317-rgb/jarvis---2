import { NextResponse } from "next/server";
import { buildJarvisStatus } from "@/lib/jarvis";

export async function GET() {
  return NextResponse.json(buildJarvisStatus());
}
