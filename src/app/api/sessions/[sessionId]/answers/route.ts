import { NextResponse } from "next/server";
import { getAnswerCount, submitAnswer } from "@/lib/answers/answer-service";
import { answerServiceErrorResponse } from "@/lib/answers/http-errors";
import { getJoinedStudent } from "@/lib/auth/student-session";
import { getSessionSocketServer, sessionRoom } from "@/lib/realtime/session-socket-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const joined = await getJoinedStudent();
  if (!joined || joined.sessionId !== sessionId) {
    return NextResponse.json({ error: "Not joined to this Session" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const answerOptionIds =
    Array.isArray(body?.answerOptionIds) && body.answerOptionIds.every((id: unknown) => typeof id === "string")
      ? (body.answerOptionIds as string[])
      : undefined;
  if (!answerOptionIds || answerOptionIds.length === 0) {
    return NextResponse.json(
      { error: "answerOptionIds is required and must contain at least one id" },
      { status: 400 }
    );
  }

  try {
    const answer = await submitAnswer(sessionId, joined.studentId, { answerOptionIds });

    const count = await getAnswerCount(answer.sessionQuestionId);
    getSessionSocketServer()
      ?.to(sessionRoom(sessionId))
      .emit("session:answer-count", { sessionQuestionId: answer.sessionQuestionId, count });

    return NextResponse.json({ answer });
  } catch (error) {
    const response = answerServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
