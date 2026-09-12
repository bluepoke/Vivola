"use client";

import { useEffect, useState, type ReactNode } from "react";
import { io } from "socket.io-client";
import type { PublicQuestionView, SetType } from "@/lib/sessions/session-service";
import type { QuestionAnalysisView } from "@/lib/answers/answer-service";
import type { LeaderboardEntryView } from "@/lib/leaderboard/leaderboard-service";
import { AnswerForm } from "@/app/join/_components/answer-form";
import { SessionEnded } from "@/app/_components/session-ended";

// Swaps a joined Student's device between the lobby, the open Question, and
// the closed Question's Analysis, live, as soon as the Lecturer opens/closes
// it — no page reload. `lobby` is server-rendered once and handed in as
// inert content to show until then. `question` is kept set through closing
// (not nulled out) so AnswerForm — which owns the Student's own submitted
// Answer as local state — stays mounted and can highlight it once Analysis
// arrives; it only unmounts (via `key`) when a genuinely new Question opens.
export function QuestionStage({
  sessionId,
  sessionType,
  initialQuestion,
  answeredOptionIds,
  initialClosedAnalysis,
  initialLeaderboard,
  initialEnded,
  lobby,
}: {
  sessionId: string;
  sessionType: SetType;
  initialQuestion: PublicQuestionView | null;
  answeredOptionIds: string[] | null;
  initialClosedAnalysis: QuestionAnalysisView | null;
  initialLeaderboard: LeaderboardEntryView[] | null;
  initialEnded: boolean;
  lobby: ReactNode;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [ownAnswerOptionIds, setOwnAnswerOptionIds] = useState(answeredOptionIds);
  const [closedAnalysis, setClosedAnalysis] = useState(initialClosedAnalysis);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [ended, setEnded] = useState(initialEnded);

  useEffect(() => {
    const socket = io();
    socket.emit("session:join-room", sessionId);
    socket.on("session:question-opened", (payload: { question: PublicQuestionView }) => {
      setQuestion(payload.question);
      setOwnAnswerOptionIds(null);
      setClosedAnalysis(null);
      setLeaderboard(null);
    });
    socket.on(
      "session:question-closed",
      (payload: { analysis: QuestionAnalysisView; leaderboard: LeaderboardEntryView[] | null }) => {
        setClosedAnalysis(payload.analysis);
        setLeaderboard(payload.leaderboard);
      }
    );
    socket.on("session:ended", (payload: { leaderboard: LeaderboardEntryView[] | null }) => {
      setEnded(true);
      setLeaderboard(payload.leaderboard);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  if (ended) {
    return <SessionEnded sessionType={sessionType} leaderboard={leaderboard} />;
  }

  const effectiveQuestion = question ?? closedAnalysis;
  if (!effectiveQuestion) {
    return <>{lobby}</>;
  }

  return (
    <AnswerForm
      key={effectiveQuestion.id}
      sessionId={sessionId}
      question={
        question ?? {
          id: closedAnalysis!.id,
          prompt: closedAnalysis!.prompt,
          type: closedAnalysis!.type,
          options: closedAnalysis!.options,
        }
      }
      initialAnsweredOptionIds={ownAnswerOptionIds}
      showCorrectAnswer={sessionType === "QUESTION"}
      closedAnalysis={closedAnalysis}
      leaderboard={leaderboard}
    />
  );
}
