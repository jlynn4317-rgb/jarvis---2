import { cleanText } from "@/lib/copy-safety";

type CampaignInput = { id: string; title: string | null; asin: string | null; niche: string | null; status: string; brief: unknown; created_at: string };
type LinkInput = { campaign_id: string | null; slug: string; clicks: number | null };

export type GuideItem = { id: string; title: string; blurb: string; slug: string; clicks: number };

// The public gift guide is a coffee & tea page: it shows products whose audience is coffee/tea
// (or the older "general" ones). Products for other audiences, hidden ones, and ones without a
// tracking link never appear.
const GUIDE_AUDIENCE = /coffee|tea|general/i;

const blurbFrom = (brief: unknown, title: string) => {
  const description = (brief as { pinDescription?: string } | null)?.pinDescription;
  const sentences = cleanText(description || "").split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, 2).join(" ") || `A closer look at ${title}.`;
};

export const buildGuide = (campaigns: CampaignInput[], links: LinkInput[]): GuideItem[] => {
  const best = new Map<string, GuideItem & { created: string }>();

  for (const campaign of campaigns) {
    if (campaign.status === "paused") continue;
    if (campaign.niche && !GUIDE_AUDIENCE.test(campaign.niche)) continue;

    const own = links.filter((link) => link.campaign_id === campaign.id);
    if (own.length === 0) continue;
    const top = [...own].sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))[0];

    const title = (campaign.title || "").trim() || "Untitled";
    const key = (campaign.asin || title).toLowerCase();
    const item = { id: campaign.id, title, blurb: blurbFrom(campaign.brief, title), slug: top.slug, clicks: own.reduce((sum, link) => sum + (link.clicks ?? 0), 0), created: campaign.created_at };

    const current = best.get(key);
    if (!current || item.clicks > current.clicks || (item.clicks === current.clicks && item.created < current.created)) best.set(key, item);
  }

  return [...best.values()]
    .sort((a, b) => b.clicks - a.clicks || a.title.localeCompare(b.title))
    .map((item) => ({ id: item.id, title: item.title, blurb: item.blurb, slug: item.slug, clicks: item.clicks }));
};
