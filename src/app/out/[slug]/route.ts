import { NextRequest, NextResponse } from "next/server";
import { getTrackingLinkBySlug, incrementTrackingLinkClicks } from "@/lib/supabase";
import { isAllowedAmazonHost } from "@/lib/product-input";

// Counts a click, then sends the visitor straight on to the product. Used by the public gift
// guide, where an email gate in front of every product would be too much friction.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getTrackingLinkBySlug(slug);
  const destination: string | undefined = result?.link?.destination;

  let target: URL | null = null;
  try {
    target = destination ? new URL(destination) : null;
  } catch {
    target = null;
  }

  // Only ever redirect to Amazon, so this can't be turned into an open redirect.
  if (!result || !target || target.protocol !== "https:" || !isAllowedAmazonHost(target.hostname)) {
    return new NextResponse("Not found", { status: 404 });
  }

  await incrementTrackingLinkClicks(result.link.id).catch(() => {});
  return NextResponse.redirect(target.toString(), 302);
}
