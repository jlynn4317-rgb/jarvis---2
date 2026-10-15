"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HideButton({ id, hidden }: { id: string; hidden: boolean }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);

  return (
    <button
      type="button"
      className="channel-chip"
      disabled={working}
      onClick={async () => {
        setWorking(true);
        try {
          await fetch("/api/campaign/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: hidden ? "active" : "paused" }),
          });
          router.refresh();
        } finally {
          setWorking(false);
        }
      }}
    >
      {hidden ? "Restore" : "Hide"}
    </button>
  );
}
