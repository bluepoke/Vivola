"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EndSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnd() {
    if (!confirm("End this Session? Everyone will see the final summary.")) return;
    setEnding(true);
    setError(null);

    const response = await fetch(`/api/sessions/${sessionId}/end-session`, {
      method: "POST",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Couldn't end this Session. Please try again.");
      setEnding(false);
      return;
    }

    router.refresh();
  }

  return (
    <div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-secondary" onClick={handleEnd} disabled={ending}>
        End Session
      </button>
    </div>
  );
}
