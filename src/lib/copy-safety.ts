import type { GeneratedCampaign } from "@/lib/copy-providers";

// Marketing copy is written by an AI, so it is filtered after the fact: whatever the model
// writes, claims we can't back up never reach a landing page, email or post.

// Scarcity, urgency, prices, rankings, awards, guarantees and medical claims.
const RISKY = new RegExp(
  String.raw`\b(?:limited (?:stock|time|quantity|supply|offer|edition)|act (?:fast|now)|hurry|while supplies last|selling fast|almost gone|(?:only|just) \d+ (?:left|remaining)|grab (?:it|yours|one|this) now|top[- ]rated|best[- ]sell(?:er|ers|ing)|number[- ]one|award[- ]winning|on sale|discount(?:ed)?|deal of the day|lowest price|best price|price drop|guarantee[ds]?|free shipping|clinically|doctor|cure[sd]?)\b|#\s?1\b|\$\s?\d|\d+\s?%\s?off`,
  "i"
);

const DISCLOSURE_SENTENCE = /\b(?:affiliate|commission|qualifying purchases|amazon associate)\b/i;
export const DISCLOSURE = "As an Amazon Associate I earn from qualifying purchases.";

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;

export const hasRiskyClaim = (text: string) => RISKY.test(text);

const RISKY_TAG = /^#(?:sale|deal|deals|discount|clearance|cheap|free\w*|bestsell\w*|best\w*|top\w*|\d\w*)$/i;

const splitSentences = (text: string) => text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);

// Removes links, markdown marks and "our/we" wording (we are not the seller), then drops any
// sentence containing a risky claim. Disclosure sentences are handled separately.
export const cleanText = (text: string) => {
  const flat = (text || "")
    .replace(URL_PATTERN, "")
    .replace(/[*`]/g, "")
    .replace(/\bOur\b/g, "This")
    .replace(/\bour\b/g, "this")
    .replace(/\s+/g, " ")
    .trim();

  return splitSentences(flat)
    .filter((sentence) => !hasRiskyClaim(sentence) && !DISCLOSURE_SENTENCE.test(sentence))
    .join(" ");
};

export const sanitizeCampaign = (campaign: GeneratedCampaign, title: string): GeneratedCampaign => {
  const product = (title || "this product").trim();

  const description = cleanText(campaign.pinDescription) || `A closer look at ${product}.`;
  const headline = cleanText(campaign.pinTitle) || product;
  const hook = cleanText(campaign.shortVideoHook) || `Thinking about ${product.toLowerCase()}?`;
  const hashtags = (campaign.hashtags || [])
    .map((tag) => String(tag).replace(/[^#\w]/g, ""))
    .filter((tag) => /^#\w{2,}$/.test(tag) && !hasRiskyClaim(tag) && !RISKY_TAG.test(tag))
    .slice(0, 5);

  return { ...campaign, pinTitle: headline, pinDescription: `${description} ${DISCLOSURE}`, shortVideoHook: hook, hashtags };
};
