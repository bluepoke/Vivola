"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CloseQuestionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClose() {
    setClosing(true);
    setError(null);

    const response = await fetch(`/api/sessions/${sessionId}/close-question`, {
      method: "POST",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Couldn't close this Question. Please try again.");
      setClosing(false);
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
      <button type="button" className="btn btn-primary" onClick={handleClose} disabled={closing}>
        Close Question
      </button>
    </div>
  );
}
