import { NextResponse } from "next/server";
import { joinSessionByJoinCode } from "@/lib/students/student-service";
import { studentServiceErrorResponse } from "@/lib/students/http-errors";
import { setJoinedStudent } from "@/lib/auth/student-session";

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
    return NextResponse.json({ student });
  } catch (error) {
    const response = studentServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
