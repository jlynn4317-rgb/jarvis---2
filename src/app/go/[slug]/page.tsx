import { notFound } from "next/navigation";
import { getTrackingLinkBySlug, incrementTrackingLinkClicks } from "@/lib/supabase";
import CaptureForm from "./capture-form";

export const dynamic = "force-dynamic";

export default async function GoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getTrackingLinkBySlug(slug);

  if (!result || !result.link?.destination) {
    notFound();
  }

  const { link, campaign, variant } = result;

  incrementTrackingLinkClicks(link.id).catch(() => {});

  const brief = (campaign?.brief ?? {}) as Record<string, unknown>;
  const headline = variant?.headline || (brief.pinTitle as string) || campaign?.title || "Here's something worth checking out";
  const hook = variant?.body || (brief.shortVideoHook as string) || (brief.pinDescription as string) || "";

  return (
    <main className="go-shell">
      <section className="go-card">
        <p className="go-eyebrow">Featured pick</p>
        <h1>{headline}</h1>
        {hook && <p className="go-hook">{hook}</p>}
        <CaptureForm campaignId={campaign?.id} trackingLinkId={link.id} destination={link.destination} />
        <p className="go-disclosure">This page may use affiliate links. We may earn a commission at no extra cost to you.</p>
      </section>
    </main>
  );
}
