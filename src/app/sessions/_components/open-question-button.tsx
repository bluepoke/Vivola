"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OpenQuestionButton({
  sessionId,
  questionId,
}: {
  sessionId: string;
  questionId: string;
}) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpening(true);
    setError(null);

    const response = await fetch(`/api/sessions/${sessionId}/open-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Couldn't open this Question. Please try again.");
      setOpening(false);
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
      <button type="button" className="btn btn-primary" onClick={handleOpen} disabled={opening}>
        Open Question
      </button>
    </div>
  );
}
