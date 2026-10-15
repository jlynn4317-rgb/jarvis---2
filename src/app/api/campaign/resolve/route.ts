import { NextRequest, NextResponse } from "next/server";
import { cleanKeywords, isAllowedAmazonHost, isShortHost, parseAmazonUrl, titleCase, titleFromSlug } from "@/lib/product-input";

export const maxDuration = 30;

// Follows amzn.to-style short links to the real Amazon address. Only Amazon's own hosts are
// ever contacted; anything else is refused, so this can't be pointed at other sites.
const followShortLink = async (start: string) => {
  let current = start;
  for (let hop = 0; hop < 4; hop++) {
    const host = new URL(current).hostname;
    if (!isAllowedAmazonHost(host)) return null;
    if (!isShortHost(host)) return current;

    const response = await fetch(current, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0" } });
    const location = response.headers.get("location");
    if (!location) return current;
    current = new URL(location, current).toString();
  }
  return current;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const entry = String(body?.entry || "").trim().slice(0, 600);
  if (!entry) return NextResponse.json({ ok: false, error: "Nothing to check." }, { status: 400 });

  if (/^https?:\/\//i.test(entry)) {
    let finalUrl: string | null = null;
    try {
      finalUrl = await followShortLink(entry);
    } catch {
      return NextResponse.json({ ok: true, entry, kind: "unknown", reason: "Couldn't open that link." });
    }
    if (!finalUrl) return NextResponse.json({ ok: true, entry, kind: "unknown", reason: "That isn't an Amazon link." });

    const parsed = parseAmazonUrl(finalUrl);
    if (parsed.kind === "product") return NextResponse.json({ ok: true, entry, kind: "product", asin: parsed.asin, title: titleFromSlug(parsed.slug) });
    if (parsed.kind === "search") return NextResponse.json({ ok: true, entry, kind: "search", keywords: parsed.keywords, title: titleCase(parsed.keywords) });
    return NextResponse.json({ ok: true, entry, kind: "unknown", reason: "That Amazon page isn't a product or a search." });
  }

  const keywords = cleanKeywords(entry);
  if (keywords.length < 2) return NextResponse.json({ ok: true, entry, kind: "unknown", reason: "Too short to search for." });
  return NextResponse.json({ ok: true, entry, kind: "search", keywords, title: titleCase(keywords) });
}
