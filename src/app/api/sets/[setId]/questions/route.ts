import { NextResponse } from "next/server";
import { addQuestion } from "@/lib/sets/set-service";
import { setServiceErrorResponse } from "@/lib/sets/http-errors";
import { parseQuestionInput } from "@/lib/sets/request-body";
import { requireLecturer } from "@/lib/auth/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ setId: string }> }
) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { setId } = await params;

  const input = await parseQuestionInput(request);
  if (!input) {
    return NextResponse.json(
      { error: "prompt and an array of options ({ text, isCorrect? }) are required; type, if present, must be SINGLE_SELECT or MULTI_SELECT" },
      { status: 400 }
    );
  }

  try {
    const question = await addQuestion(lecturer.id, setId, input);
    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    const response = setServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
