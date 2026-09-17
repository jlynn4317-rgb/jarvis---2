export type Channel = "pinterest" | "tiktok" | "x";

export type ChannelContent = {
  headline: string;
  body: string;
  hook?: string;
  hashtags?: string[];
  linkUrl: string;
};

const isConfigured = (value: string | undefined) => Boolean(value && !value.includes("your_") && value.trim());

export type PublishResult = { ok: boolean; status: "posted" | "failed" | "manual_pending"; externalId?: string; error?: string };

const publishToPinterest = async (content: ChannelContent): Promise<PublishResult> => {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  const boardId = process.env.PINTEREST_BOARD_ID;
  if (!isConfigured(token) || !isConfigured(boardId)) {
    return { ok: false, status: "manual_pending", error: "PINTEREST_ACCESS_TOKEN / PINTEREST_BOARD_ID not configured." };
  }

  const response = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      board_id: boardId,
      title: content.headline.slice(0, 100),
      description: content.body.slice(0, 500),
      link: content.linkUrl,
    }),
  });

  if (!response.ok) {
    return { ok: false, status: "failed", error: `Pinterest API ${response.status}: ${await response.text()}` };
  }

  const json = await response.json();
  return { ok: true, status: "posted", externalId: json?.id };
};

const publishToX = async (content: ChannelContent): Promise<PublishResult> => {
  const token = process.env.X_ACCESS_TOKEN;
  if (!isConfigured(token)) {
    return { ok: false, status: "manual_pending", error: "X_ACCESS_TOKEN not configured." };
  }

  const text = `${content.hook || content.headline}\n\n${content.linkUrl}\n\n${(content.hashtags ?? []).join(" ")}`.slice(0, 280);

  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    return { ok: false, status: "failed", error: `X API ${response.status}: ${await response.text()}` };
  }

  const json = await response.json();
  return { ok: true, status: "posted", externalId: json?.data?.id };
};

// TikTok's Content Posting API requires an uploaded video asset, which this pipeline
// does not generate. Queue the script for a human (or a future video-gen step) instead
// of pretending to auto-publish.
const publishToTikTok = async (): Promise<PublishResult> => ({
  ok: false,
  status: "manual_pending",
  error: "TikTok requires a video asset; script is queued for manual upload.",
});

export const publishToChannel = async (channel: Channel, content: ChannelContent): Promise<PublishResult> => {
  switch (channel) {
    case "pinterest":
      return publishToPinterest(content);
    case "x":
      return publishToX(content);
    case "tiktok":
      return publishToTikTok();
    default:
      return { ok: false, status: "failed", error: `Unknown channel: ${channel}` };
  }
};
