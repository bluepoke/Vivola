"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SetType } from "@/lib/sets/set-service";

export function CreateSetForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<SetType>("SURVEY");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Something went wrong" }));
      setError(body.error ?? "Something went wrong");
      return;
    }

    const { set } = await response.json();
    router.push(`/sets/${set.id}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Title
        <input
          type="text"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label>
        Type
        <select value={type} onChange={(event) => setType(event.target.value as SetType)}>
          <option value="SURVEY">Survey Set (opinions, no correct answer)</option>
          <option value="QUESTION">Question Set (quiz, one correct answer per question)</option>
        </select>
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={submitting}>
        Create Set
      </button>
    </form>
  );
}
