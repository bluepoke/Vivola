"use client";

import { useEffect, useState, type ReactNode } from "react";
import { io } from "socket.io-client";
import type { PublicQuestionView } from "@/lib/sessions/session-service";

// Swaps the Presentation view between the join QR code/lobby and the open
// Question, live, as soon as the Lecturer opens it — no page reload. `lobby`
// is server-rendered once and handed in as inert content to show until then.
export function SessionStage({
  sessionId,
  initialQuestion,
  lobby,
}: {
  sessionId: string;
  initialQuestion: PublicQuestionView | null;
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
    <section aria-label="Open Question">
      <h2>{question.prompt}</h2>
      <ul>
        {question.options.map((option) => (
          <li key={option.id}>{option.text}</li>
        ))}
      </ul>
    </section>
  );
}
