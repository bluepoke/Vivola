import { NextResponse } from "next/server";
import {
  AlreadyAnsweredError,
  InvalidAnswerOptionError,
  NoOpenQuestionError,
  NotFoundError,
} from "@/lib/answers/answer-service";

export function answerServiceErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof InvalidAnswerOptionError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof NoOpenQuestionError || error instanceof AlreadyAnsweredError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return null;
}
