import { NextResponse } from "next/server";
import { deleteQuestion, updateQuestion } from "@/lib/sets/set-service";
import { setServiceErrorResponse } from "@/lib/sets/http-errors";
import { parseQuestionInput } from "@/lib/sets/request-body";
import { requireLecturer } from "@/lib/auth/session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ setId: string; questionId: string }> }
) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { setId, questionId } = await params;

  const input = await parseQuestionInput(request);
  if (!input) {
    return NextResponse.json(
      { error: "prompt and an array of options ({ text, isCorrect? }) are required" },
      { status: 400 }
    );
  }

  try {
    const question = await updateQuestion(lecturer.id, setId, questionId, input);
    return NextResponse.json({ question });
  } catch (error) {
    const response = setServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ setId: string; questionId: string }> }
) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { setId, questionId } = await params;

  try {
    await deleteQuestion(lecturer.id, setId, questionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const response = setServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
