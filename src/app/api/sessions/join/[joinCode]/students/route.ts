import { NextResponse } from "next/server";
import { getStudentCount, joinSessionByJoinCode } from "@/lib/students/student-service";
import { studentServiceErrorResponse } from "@/lib/students/http-errors";
import { setJoinedStudent } from "@/lib/auth/student-session";
import { getSessionSocketServer, sessionRoom } from "@/lib/realtime/session-socket-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ joinCode: string }> }
) {
  const { joinCode } = await params;
  const body = await request.json().catch(() => ({}));
  const nickname = typeof body?.nickname === "string" ? body.nickname : undefined;

  try {
    const student = await joinSessionByJoinCode(joinCode, { nickname });
    await setJoinedStudent(student.sessionId, student.id);

    const count = await getStudentCount(student.sessionId);
    getSessionSocketServer()
      ?.to(sessionRoom(student.sessionId))
      .emit("session:student-count", { count });

    return NextResponse.json({ student });
  } catch (error) {
    const response = studentServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
