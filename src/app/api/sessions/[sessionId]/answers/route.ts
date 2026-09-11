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
  const answerOptionId = typeof body?.answerOptionId === "string" ? body.answerOptionId : undefined;
  if (!answerOptionId) {
    return NextResponse.json({ error: "answerOptionId is required" }, { status: 400 });
  }

  try {
    const answer = await submitAnswer(sessionId, joined.studentId, { answerOptionId });

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
