import { NextResponse } from "next/server";
import {
  AlreadyActiveSessionError,
  NotFoundError,
  OutOfOrderQuestionError,
  QuestionAlreadyOpenError,
} from "@/lib/sessions/session-service";

export function sessionServiceErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof AlreadyActiveSessionError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof QuestionAlreadyOpenError || error instanceof OutOfOrderQuestionError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  return null;
}
