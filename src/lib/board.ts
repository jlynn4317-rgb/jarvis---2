export type BoardRow = {
  id: string;
  title: string;
  asin: string | null;
  niche: string | null;
  status: string;
  clicks: number;
  leads: number;
  versions: number;
  lastPostedAt: string | null;
  waitingApproval: number;
  hidden: boolean;
  bestSlug: string | null;
  createdAt: string;
};

type CampaignInput = { id: string; title: string | null; asin: string | null; niche: string | null; status: string; created_at: string };
type LinkInput = { campaign_id: string | null; slug: string; clicks: number | null; copy_variant_id: string | null };
type LeadInput = { campaign_id: string | null };
type PostInput = { campaign_id: string | null; status: string; posted_at: string | null };

// One row per product with its clicks, signups and posting history, plus the product that
// is next in line to be posted (never posted first, otherwise the longest ago). Hidden
// (paused) rows and rows without a product code are never suggested.
export const buildBoard = (campaigns: CampaignInput[], links: LinkInput[], leads: LeadInput[], posts: PostInput[]) => {
  const rows: BoardRow[] = campaigns.map((campaign) => {
    const own = links.filter((link) => link.campaign_id === campaign.id);
    const best = [...own].sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))[0];
    const ownPosts = posts.filter((post) => post.campaign_id === campaign.id);
    const posted = ownPosts.map((post) => post.posted_at).filter((date): date is string => Boolean(date)).sort();

    return {
      id: campaign.id,
      title: campaign.title || "Untitled",
      asin: campaign.asin,
      niche: campaign.niche,
      status: campaign.status,
      clicks: own.reduce((sum, link) => sum + (link.clicks ?? 0), 0),
      leads: leads.filter((lead) => lead.campaign_id === campaign.id).length,
      versions: own.filter((link) => link.copy_variant_id).length,
      lastPostedAt: posted.length ? posted[posted.length - 1] : null,
      waitingApproval: ownPosts.filter((post) => post.status === "pending_approval").length,
      hidden: campaign.status === "paused",
      bestSlug: best?.slug ?? null,
      createdAt: campaign.created_at,
    };
  });

  const next = rows
    .filter((row) => row.bestSlug && row.asin && !row.hidden)
    .sort((a, b) => {
      if (!a.lastPostedAt && !b.lastPostedAt) return a.createdAt.localeCompare(b.createdAt);
      if (!a.lastPostedAt) return -1;
      if (!b.lastPostedAt) return 1;
      return a.lastPostedAt.localeCompare(b.lastPostedAt);
    })[0];

  return { rows, nextId: next?.id ?? null };
};
