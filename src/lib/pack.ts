import { postingOrder, type BoardRow } from "@/lib/board";
import { cleanText, DISCLOSURE } from "@/lib/copy-safety";

type VariantInput = { id: string; campaign_id: string; tone: string | null; headline: string | null; body: string | null; winner: boolean | null };
type LinkInput = { campaign_id: string | null; slug: string; copy_variant_id: string | null };
type PostInput = { campaign_id: string | null; status: string };

export type PackItem = {
  campaignId: string;
  variantId: string | null;
  title: string;
  tone: string | null;
  link: string;
  pinterest: { title: string; description: string; link: string };
  facebook: string;
  instagram: string;
  tiktok: { hook: string; lines: string[]; ending: string; caption: string };
  youtube: { title: string; description: string };
};

const firstSentences = (text: string, count: number) => text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, count).join(" ");

// Turns the next products to post into ready-to-paste material for each platform. Reuses the
// copy already written (and filtered) for each product, so no new AI calls are needed. The
// version used rotates with how many times a product has already been posted; a winning
// version, once there is one, is always preferred.
export const buildPack = (
  rows: BoardRow[],
  variants: VariantInput[],
  links: LinkInput[],
  posts: PostInput[],
  { count, origin }: { count: number; origin: string }
): PackItem[] =>
  postingOrder(rows)
    .slice(0, count)
    .map((row) => {
      const own = variants.filter((variant) => variant.campaign_id === row.id);
      const timesPosted = posts.filter((post) => post.campaign_id === row.id && post.status === "posted").length;
      const chosen = own.find((variant) => variant.winner) ?? (own.length ? own[timesPosted % own.length] : null);

      const slug = (chosen && links.find((link) => link.copy_variant_id === chosen.id)?.slug) || row.bestSlug;
      const link = `${origin}/go/${slug}`;

      const headline = cleanText(chosen?.headline || "") || row.title;
      const body = firstSentences(cleanText(chosen?.body || ""), 2) || `A closer look at ${row.title}.`;
      const audience = row.niche && row.niche !== "general" ? row.niche : "gift givers";

      return {
        campaignId: row.id,
        variantId: chosen?.id ?? null,
        title: row.title,
        tone: chosen?.tone ?? null,
        link,
        pinterest: { title: headline.slice(0, 100), description: `${body} ${DISCLOSURE}`.slice(0, 500), link },
        facebook: `${headline}\n\n${body}\n\n${link}\n\n(Affiliate link. I may earn a commission.)`,
        instagram: `${headline}\n\n${body}\n\nLink in bio.\n\n#ad #giftideas`,
        tiktok: {
          hook: `Gift idea for ${audience}`,
          lines: [row.title, firstSentences(body, 1)],
          ending: "Link in bio. Affiliate links.",
          caption: `${headline} Link in bio. #ad #giftideas`,
        },
        youtube: {
          title: `${headline.slice(0, 80)} #Shorts`,
          description: `${body}\n\nSee the full list: ${origin}/gifts\n\nAffiliate links. ${DISCLOSURE}`,
        },
      };
    });
