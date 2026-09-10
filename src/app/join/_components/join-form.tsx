"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SetType } from "@/lib/sessions/session-service";

export function JoinForm({ joinCode, sessionType }: { joinCode: string; sessionType: SetType }) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setJoining(true);
    setError(null);

    const response = await fetch(`/api/sessions/join/${joinCode}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sessionType === "QUESTION" ? { nickname } : {}),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Couldn't join this Session. Please try again.");
      setJoining(false);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {sessionType === "QUESTION" && (
        <label>
          Nickname
          <input
            type="text"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            required
          />
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={joining}>
        Join
      </button>
    </form>
  );
}
