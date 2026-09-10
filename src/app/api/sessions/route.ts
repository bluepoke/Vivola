import { NextResponse } from "next/server";
import { startSession } from "@/lib/sessions/session-service";
import { sessionServiceErrorResponse } from "@/lib/sessions/http-errors";
import { requireLecturer } from "@/lib/auth/session";

export async function POST(request: Request) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.setId !== "string" ||
    (body.displayMode !== "SPLIT" && body.displayMode !== "COMBINED")
  ) {
    return NextResponse.json(
      { error: "setId and displayMode ('SPLIT' or 'COMBINED') are required" },
      { status: 400 }
    );
  }

  try {
    const session = await startSession(lecturer.id, {
      setId: body.setId,
      displayMode: body.displayMode,
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    const response = sessionServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
