"use client";

import { useState } from "react";
import type { PublicQuestionView } from "@/lib/sessions/session-service";
import type { QuestionAnalysisView } from "@/lib/answers/answer-service";
import type { LeaderboardEntryView } from "@/lib/leaderboard/leaderboard-service";
import { QuestionAnalysis } from "@/app/_components/question-analysis";

export function AnswerForm({
  sessionId,
  question,
  initialAnsweredOptionIds,
  showCorrectAnswer = false,
  closedAnalysis = null,
  leaderboard = null,
}: {
  sessionId: string;
  question: PublicQuestionView;
  initialAnsweredOptionIds: string[] | null;
  showCorrectAnswer?: boolean;
  closedAnalysis?: QuestionAnalysisView | null;
  leaderboard?: LeaderboardEntryView[] | null;
}) {
  const [answeredOptionIds, setAnsweredOptionIds] = useState(initialAnsweredOptionIds);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isMultiSelect = question.type === "MULTI_SELECT";

  if (closedAnalysis) {
    return (
      <QuestionAnalysis
        analysis={closedAnalysis}
        showCorrectAnswer={showCorrectAnswer}
        ownAnswerOptionIds={answeredOptionIds}
        leaderboard={leaderboard}
      />
    );
  }

  if (answeredOptionIds) {
    const chosen = question.options.filter((option) => answeredOptionIds.includes(option.id));
    return (
      <section aria-label="Your Answer" className="card" style={{ textAlign: "center" }}>
        <span className="tag tag-accent" style={{ alignSelf: "center" }}>
          Answer locked in
        </span>
        <h2 style={{ margin: 0 }}>{question.prompt}</h2>
        <p style={{ margin: 0, fontWeight: 700 }}>{chosen.map((option) => option.text).join(", ")}</p>
        <p className="text-muted" style={{ margin: 0 }}>Waiting for other participants&hellip;</p>
      </section>
    );
  }

  function toggleOption(optionId: string) {
    if (isMultiSelect) {
      setSelectedOptionIds((current) =>
        current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
      );
    } else {
      setSelectedOptionIds([optionId]);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedOptionIds.length === 0) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch(`/api/sessions/${sessionId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerOptionIds: selectedOptionIds }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Couldn't submit your Answer. Please try again.");
      setSubmitting(false);
      return;
    }

    setAnsweredOptionIds(selectedOptionIds);
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Answer this Question" className="card">
      <h2 style={{ margin: 0 }}>{question.prompt}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {question.options.map((option) => {
          const selected = selectedOptionIds.includes(option.id);
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
                type={isMultiSelect ? "checkbox" : "radio"}
                name="answerOptionId"
                value={option.id}
                checked={selected}
                onChange={() => toggleOption(option.id)}
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
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={submitting || selectedOptionIds.length === 0}
      >
        Submit Answer
      </button>
    </form>
  );
}
