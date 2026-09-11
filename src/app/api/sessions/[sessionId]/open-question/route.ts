import { NextResponse } from "next/server";
import { openQuestion } from "@/lib/sessions/session-service";
import { sessionServiceErrorResponse } from "@/lib/sessions/http-errors";
import { requireLecturer } from "@/lib/auth/session";
import { getSessionSocketServer, sessionRoom } from "@/lib/realtime/session-socket-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { sessionId } = await params;
  const body = await request.json().catch(() => ({}));
  const questionId = typeof body?.questionId === "string" ? body.questionId : undefined;
  if (!questionId) {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }

  try {
    const question = await openQuestion(lecturer.id, sessionId, questionId);

    getSessionSocketServer()
      ?.to(sessionRoom(sessionId))
      .emit("session:question-opened", {
        question: {
          id: question.id,
          prompt: question.prompt,
          options: question.options.map((option) => ({ id: option.id, text: option.text })),
        },
      });

    return NextResponse.json({ question });
  } catch (error) {
    const response = sessionServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
