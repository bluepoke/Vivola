import { NextResponse } from "next/server";
import { getSessionByJoinCode } from "@/lib/sessions/session-service";
import { sessionServiceErrorResponse } from "@/lib/sessions/http-errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ joinCode: string }> }
) {
  const { joinCode } = await params;

  try {
    const session = await getSessionByJoinCode(joinCode);
    return NextResponse.json({ session });
  } catch (error) {
    const response = sessionServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
