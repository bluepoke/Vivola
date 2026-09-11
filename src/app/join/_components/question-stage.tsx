"use client";

import { useEffect, useState, type ReactNode } from "react";
import { io } from "socket.io-client";
import type { PublicQuestionView } from "@/lib/sessions/session-service";
import { AnswerForm } from "@/app/join/_components/answer-form";

// Swaps a joined Student's device between the lobby and the open Question,
// live, as soon as the Lecturer opens it — no page reload. `lobby` is
// server-rendered once and handed in as inert content to show until then.
export function QuestionStage({
  sessionId,
  initialQuestion,
  answeredOptionId,
  lobby,
}: {
  sessionId: string;
  initialQuestion: PublicQuestionView | null;
  answeredOptionId: string | null;
  lobby: ReactNode;
}) {
  const [question, setQuestion] = useState(initialQuestion);

  useEffect(() => {
    const socket = io();
    socket.emit("session:join-room", sessionId);
    socket.on("session:question-opened", (payload: { question: PublicQuestionView }) => {
      setQuestion(payload.question);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  if (!question) {
    return <>{lobby}</>;
  }

  return (
    <AnswerForm sessionId={sessionId} question={question} initialAnsweredOptionId={answeredOptionId} />
  );
}
