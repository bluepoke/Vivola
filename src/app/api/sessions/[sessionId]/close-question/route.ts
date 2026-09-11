import { NextResponse } from "next/server";
import { closeQuestion, getSessionType } from "@/lib/sessions/session-service";
import { sessionServiceErrorResponse } from "@/lib/sessions/http-errors";
import { requireLecturer } from "@/lib/auth/session";
import { getQuestionAnalysis } from "@/lib/answers/answer-service";
import { getLeaderboard } from "@/lib/leaderboard/leaderboard-service";
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
    const closedQuestion = await closeQuestion(lecturer.id, sessionId);
    const analysis = await getQuestionAnalysis(closedQuestion);

    // Quiz Sessions only: Survey Sessions never show a Leaderboard (see
    // CONTEXT.md's Leaderboard definition).
    const sessionType = await getSessionType(lecturer.id, sessionId);
    const leaderboard = sessionType === "QUESTION" ? await getLeaderboard(sessionId) : null;

    getSessionSocketServer()
      ?.to(sessionRoom(sessionId))
      .emit("session:question-closed", { analysis, leaderboard });

    return NextResponse.json({ analysis, leaderboard });
  } catch (error) {
    const response = sessionServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
