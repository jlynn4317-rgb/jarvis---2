"use client";

import { useState } from "react";

export default function CaptureForm({
  campaignId,
  trackingLinkId,
  destination,
}: {
  campaignId?: string;
  trackingLinkId?: string;
  destination: string;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const goToOffer = () => {
    window.location.href = destination;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes("@") || submitting) return;

    setSubmitting(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, campaignId, trackingLinkId, source: "landing_page" }),
      });
    } catch {
      // Non-blocking: still route to the offer even if capture fails.
    } finally {
      goToOffer();
    }
  };

  return (
    <div className="capture-card">
      <form onSubmit={handleSubmit} className="capture-form">
        <label>
          Email
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Sending you there..." : "Get the deal + updates"}
        </button>
      </form>
      <button type="button" className="capture-skip" onClick={goToOffer}>
        No thanks, just take me to the deal
      </button>
    </div>
  );
}
