"use client";

import { useState } from "react";
import type { PublicQuestionView } from "@/lib/sessions/session-service";
import type { QuestionAnalysisView } from "@/lib/answers/answer-service";
import type { LeaderboardEntryView } from "@/lib/leaderboard/leaderboard-service";
import { QuestionAnalysis } from "@/app/_components/question-analysis";

export function AnswerForm({
  sessionId,
  question,
  initialAnsweredOptionId,
  showCorrectAnswer = false,
  closedAnalysis = null,
  leaderboard = null,
}: {
  sessionId: string;
  question: PublicQuestionView;
  initialAnsweredOptionId: string | null;
  showCorrectAnswer?: boolean;
  closedAnalysis?: QuestionAnalysisView | null;
  leaderboard?: LeaderboardEntryView[] | null;
}) {
  const [answeredOptionId, setAnsweredOptionId] = useState(initialAnsweredOptionId);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (closedAnalysis) {
    return (
      <QuestionAnalysis
        analysis={closedAnalysis}
        showCorrectAnswer={showCorrectAnswer}
        ownAnswerOptionId={answeredOptionId}
        leaderboard={leaderboard}
      />
    );
  }

  if (answeredOptionId) {
    const chosen = question.options.find((option) => option.id === answeredOptionId);
    return (
      <section aria-label="Your Answer" className="card" style={{ textAlign: "center" }}>
        <span className="tag tag-accent" style={{ alignSelf: "center" }}>
          Answer locked in
        </span>
        <h2 style={{ margin: 0 }}>{question.prompt}</h2>
        <p style={{ margin: 0, fontWeight: 700 }}>{chosen?.text}</p>
        <p className="text-muted" style={{ margin: 0 }}>Waiting for other participants&hellip;</p>
      </section>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedOptionId) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch(`/api/sessions/${sessionId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerOptionId: selectedOptionId }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Couldn't submit your Answer. Please try again.");
      setSubmitting(false);
      return;
    }

    setAnsweredOptionId(selectedOptionId);
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Answer this Question" className="card">
      <h2 style={{ margin: 0 }}>{question.prompt}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {question.options.map((option) => {
          const selected = selectedOptionId === option.id;
          return (
            <label
              key={option.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                border: "2px solid var(--color-text)",
                padding: "12px 14px",
                fontSize: 14,
                fontWeight: 700,
                background: selected ? "var(--color-accent)" : "transparent",
                color: selected ? "#fff" : "var(--color-text)",
              }}
            >
              <input
                type="radio"
                name="answerOptionId"
                value={option.id}
                checked={selected}
                onChange={() => setSelectedOptionId(option.id)}
                style={{ accentColor: "var(--color-accent)" }}
              />
              {option.text}
            </label>
          );
        })}
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting || !selectedOptionId}>
        Submit Answer
      </button>
    </form>
  );
}
