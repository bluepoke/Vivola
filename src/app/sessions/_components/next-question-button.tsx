"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NextQuestionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNext() {
    setAdvancing(true);
    setError(null);

    const response = await fetch(`/api/sessions/${sessionId}/next-question`, {
      method: "POST",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Couldn't advance to the next Question. Please try again.");
      setAdvancing(false);
      return;
    }

    router.refresh();
  }

  return (
    <div>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={handleNext} disabled={advancing}>
        Next Question
      </button>
    </div>
  );
}
