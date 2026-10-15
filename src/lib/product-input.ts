// Turns whatever the owner pastes (links stuck together, notes in brackets, plain words)
// into clean product entries. Pure functions so they can be tested without a network.

const AMAZON_HOST = /(^|\.)amazon\.(com|ca|co\.uk|de|fr|it|es|co\.jp|com\.au|in)$/i;
const SHORT_HOST = /^(amzn\.to|a\.co|amzn\.com)$/i;

export const isAllowedAmazonHost = (host: string) => AMAZON_HOST.test(host) || SHORT_HOST.test(host);
export const isShortHost = (host: string) => SHORT_HOST.test(host);

// Splits "https://a.to/xhttps://a.to/y  words here" into separate entries, drops
// empties and exact duplicates, keeps order.
export const extractEntries = (text: string): string[] => {
  const entries: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^[\d]+(?=https?:)/, "");
    if (!line) continue;

    const urls = line.match(/https?:\/\/[^\s]+?(?=https?:\/\/|\s|$)/g);
    const pieces = urls && urls.length > 0 ? urls : [line];

    for (const piece of pieces) {
      const entry = piece.trim();
      const key = entry.toLowerCase();
      if (entry && !seen.has(key)) {
        seen.add(key);
        entries.push(entry);
      }
    }
  }

  return entries;
};

// "Electric kettle, for pour-over (Fellow and Cosori are popular names)" -> "Electric kettle"
export const cleanKeywords = (raw: string) =>
  raw
    .replace(/\([^)]*\)/g, " ")
    .split(",")[0]
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

export const titleCase = (words: string) => words.replace(/\b([a-z])/g, (letter) => letter.toUpperCase());

export type ParsedAmazon = { kind: "product"; asin: string; slug: string } | { kind: "search"; keywords: string } | { kind: "unknown" };

export const parseAmazonUrl = (rawUrl: string): ParsedAmazon => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: "unknown" };
  }

  const asinMatch = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i);
  if (asinMatch) {
    const before = url.pathname.slice(0, asinMatch.index ?? 0).replace(/^\/+/, "");
    return { kind: "product", asin: asinMatch[1].toUpperCase(), slug: before };
  }

  if (/^\/s\/?$/.test(url.pathname)) {
    const keywords = cleanKeywords(url.searchParams.get("k") || "");
    if (keywords) return { kind: "search", keywords };
  }

  return { kind: "unknown" };
};

export const titleFromSlug = (slug: string) => {
  const words = decodeURIComponent(slug || "").replace(/[-_+]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
  return words || "Amazon product";
};
