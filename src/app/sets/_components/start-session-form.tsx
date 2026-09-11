"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DisplayMode } from "@/lib/sessions/session-service";

export function StartSessionForm({ setId }: { setId: string }) {
  const router = useRouter();
  const [displayMode, setDisplayMode] = useState<DisplayMode>("SPLIT");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setId, displayMode }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Something went wrong" }));
      setError(body.error ?? "Something went wrong");
      return;
    }

    const { session } = await response.json();
    router.push(`/sessions/${session.id}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>Display mode</label>
        <select
          className="input"
          value={displayMode}
          onChange={(event) => setDisplayMode(event.target.value as DisplayMode)}
        >
          <option value="SPLIT">Split (separate Presentation and control screens)</option>
          <option value="COMBINED">Combined (one screen for both)</option>
        </select>
      </div>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        Start Session
      </button>
    </form>
  );
}
