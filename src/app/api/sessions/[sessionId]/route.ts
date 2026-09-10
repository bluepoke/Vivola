import { NextResponse } from "next/server";
import { getSession as getSessionById } from "@/lib/sessions/session-service";
import { sessionServiceErrorResponse } from "@/lib/sessions/http-errors";
import { requireLecturer } from "@/lib/auth/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { sessionId } = await params;

  try {
    const session = await getSessionById(lecturer.id, sessionId);
    return NextResponse.json({ session });
  } catch (error) {
    const response = sessionServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
