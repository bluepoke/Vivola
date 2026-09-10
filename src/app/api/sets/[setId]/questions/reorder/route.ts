import { NextResponse } from "next/server";
import { reorderQuestions } from "@/lib/sets/set-service";
import { setServiceErrorResponse } from "@/lib/sets/http-errors";
import { requireLecturer } from "@/lib/auth/session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ setId: string }> }
) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { setId } = await params;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.orderedQuestionIds) || !body.orderedQuestionIds.every((id: unknown) => typeof id === "string")) {
    return NextResponse.json({ error: "orderedQuestionIds must be an array of strings" }, { status: 400 });
  }

  try {
    const questions = await reorderQuestions(lecturer.id, setId, body.orderedQuestionIds);
    return NextResponse.json({ questions });
  } catch (error) {
    const response = setServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
