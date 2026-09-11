"use client";

import { useEffect, useState, type ReactNode } from "react";
import { io } from "socket.io-client";
import type { PublicQuestionView } from "@/lib/sessions/session-service";

// Swaps the Presentation view between the join QR code/lobby and the open
// Question, live, as soon as the Lecturer opens it — no page reload. `lobby`
// is server-rendered once and handed in as inert content to show until then.
// `initialTotalStudents` is only accurate if a Question was already open when
// this page loaded (joining is closed by then); otherwise it's whatever the
// Student count was at load time, which the "session:question-opened" event
// corrects with the definitive count taken at the moment joining closed.
export function SessionStage({
  sessionId,
  initialQuestion,
  initialAnsweredCount,
  initialTotalStudents,
  lobby,
}: {
  sessionId: string;
  initialQuestion: PublicQuestionView | null;
  initialAnsweredCount: number;
  initialTotalStudents: number;
  lobby: ReactNode;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answeredCount, setAnsweredCount] = useState(initialAnsweredCount);
  const [totalStudents, setTotalStudents] = useState(initialTotalStudents);

  useEffect(() => {
    const socket = io();
    socket.emit("session:join-room", sessionId);
    socket.on(
      "session:question-opened",
      (payload: { question: PublicQuestionView; totalStudents: number }) => {
        setQuestion(payload.question);
        setAnsweredCount(0);
        setTotalStudents(payload.totalStudents);
      }
    );
    socket.on("session:answer-count", (payload: { sessionQuestionId: string; count: number }) => {
      setAnsweredCount(payload.count);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

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
