"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RewriteButton({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [progress, setProgress] = useState<{ done: number; failed: number } | null>(null);
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!window.confirm(`Rewrite the written copy for ${ids.length} product${ids.length === 1 ? "" : "s"}? Links, clicks and signups stay exactly as they are.`)) return;

    setWorking(true);
    let done = 0;
    let failed = 0;
    setProgress({ done, failed });

    for (const id of ids) {
      try {
        const response = await fetch("/api/campaign/regenerate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
        const data = await response.json();
        if (data.ok) done++;
        else failed++;
      } catch {
        failed++;
      }
      setProgress({ done, failed });
    }

    setWorking(false);
    router.refresh();
  };

  return (
    <span className="rewrite-wrap">
      <button type="button" className="channel-chip" onClick={run} disabled={working || ids.length === 0}>
        {working ? "Rewriting... keep this page open" : "Rewrite all copy"}
      </button>
      {progress && (
        <span className="board-empty">
          {progress.done} of {ids.length} rewritten{progress.failed > 0 ? `, ${progress.failed} didn't work` : ""}
        </span>
      )}
    </span>
  );
}
