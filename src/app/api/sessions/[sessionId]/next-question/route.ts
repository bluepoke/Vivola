import { NextResponse } from "next/server";
import { nextQuestion } from "@/lib/sessions/session-service";
import { sessionServiceErrorResponse } from "@/lib/sessions/http-errors";
import { requireLecturer } from "@/lib/auth/session";
import { getStudentCount } from "@/lib/students/student-service";
import { getSessionSocketServer, sessionRoom } from "@/lib/realtime/session-socket-server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { sessionId } = await params;

  try {
    const question = await nextQuestion(lecturer.id, sessionId);
    const totalStudents = await getStudentCount(sessionId);

    getSessionSocketServer()
      ?.to(sessionRoom(sessionId))
      .emit("session:question-opened", {
        question: {
          id: question.id,
          prompt: question.prompt,
          type: question.type,
          options: question.options.map((option) => ({ id: option.id, text: option.text })),
        },
        totalStudents,
      });

    return NextResponse.json({ question });
  } catch (error) {
    const response = sessionServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
