import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/supabase";

export async function GET() {
  const data = await getDashboardData();
  return NextResponse.json({
    ...data,
    counts: {
      campaigns: data.campaigns.length,
      telemetry: data.telemetry.length,
      offers: data.offers.length,
      leads: data.leads.length,
      socialPosts: data.socialPosts.length,
    },
  });
}