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
      <section aria-label="Your Answer">
        <h2>{question.prompt}</h2>
        <p>
          Your Answer: <strong>{chosen?.text}</strong>
        </p>
        <p>Your Answer is locked in.</p>
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
    <form onSubmit={handleSubmit} aria-label="Answer this Question">
      <h2>{question.prompt}</h2>
      {question.options.map((option) => (
        <label key={option.id} style={{ display: "block" }}>
          <input
            type="radio"
            name="answerOptionId"
            value={option.id}
            checked={selectedOptionId === option.id}
            onChange={() => setSelectedOptionId(option.id)}
          />
          {option.text}
        </label>
      ))}
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting || !selectedOptionId}>
        Submit Answer
      </button>
    </form>
  );
}
