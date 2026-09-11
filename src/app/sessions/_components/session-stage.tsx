"use client";

import { useEffect, useState, type ReactNode } from "react";
import { io } from "socket.io-client";
import type { PublicQuestionView, SetType } from "@/lib/sessions/session-service";
import type { QuestionAnalysisView } from "@/lib/answers/answer-service";
import type { LeaderboardEntryView } from "@/lib/leaderboard/leaderboard-service";
import { QuestionAnalysis } from "@/app/_components/question-analysis";
import { SessionEnded } from "@/app/_components/session-ended";

// Swaps the Presentation view between the join QR code/lobby, the open
// Question, and the closed Question's Analysis, live, as soon as the
// Lecturer opens/closes it — no page reload. `lobby` is server-rendered once
// and handed in as inert content to show until then. `initialTotalStudents`
// is only accurate if a Question was already open when this page loaded
// (joining is closed by then); otherwise it's whatever the Student count was
// at load time, which the "session:question-opened" event corrects with the
// definitive count taken at the moment joining closed.
export function SessionStage({
  sessionId,
  sessionType,
  initialQuestion,
  initialAnsweredCount,
  initialTotalStudents,
  initialAnalysis,
  initialLeaderboard,
  initialEnded,
  lobby,
}: {
  sessionId: string;
  sessionType: SetType;
  initialQuestion: PublicQuestionView | null;
  initialAnsweredCount: number;
  initialTotalStudents: number;
  initialAnalysis: QuestionAnalysisView | null;
  initialLeaderboard: LeaderboardEntryView[] | null;
  initialEnded: boolean;
  lobby: ReactNode;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answeredCount, setAnsweredCount] = useState(initialAnsweredCount);
  const [totalStudents, setTotalStudents] = useState(initialTotalStudents);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [ended, setEnded] = useState(initialEnded);

  useEffect(() => {
    const socket = io();
    socket.emit("session:join-room", sessionId);
    socket.on(
      "session:question-opened",
      (payload: { question: PublicQuestionView; totalStudents: number }) => {
        setQuestion(payload.question);
        setAnalysis(null);
        setLeaderboard(null);
        setAnsweredCount(0);
        setTotalStudents(payload.totalStudents);
      }
    );
    socket.on("session:answer-count", (payload: { sessionQuestionId: string; count: number }) => {
      setAnsweredCount(payload.count);
    });
    socket.on(
      "session:question-closed",
      (payload: { analysis: QuestionAnalysisView; leaderboard: LeaderboardEntryView[] | null }) => {
        setQuestion(null);
        setAnalysis(payload.analysis);
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

  if (analysis) {
    return (
      <QuestionAnalysis analysis={analysis} showCorrectAnswer={sessionType === "QUESTION"} leaderboard={leaderboard} />
    );
  }

  if (!question) {
    return <>{lobby}</>;
  }

  return (
    <section aria-label="Open Question">
      <h2>{question.prompt}</h2>
      <ul>
        {question.options.map((option) => (
          <li key={option.id}>{option.text}</li>
        ))}
      </ul>
      <p>
        Answered: {answeredCount}/{totalStudents}
      </p>
    </section>
  );
}
