import { NextResponse } from "next/server";
import {
  AlreadyActiveSessionError,
  NoNextQuestionError,
  NotFoundError,
  OutOfOrderQuestionError,
  QuestionAlreadyOpenError,
  QuestionNotClosedError,
  QuestionNotOpenError,
  SessionEndedError,
} from "@/lib/sessions/session-service";

export function sessionServiceErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof AlreadyActiveSessionError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (
    error instanceof QuestionAlreadyOpenError ||
    error instanceof OutOfOrderQuestionError ||
    error instanceof QuestionNotOpenError ||
    error instanceof QuestionNotClosedError ||
    error instanceof NoNextQuestionError ||
    error instanceof SessionEndedError
  ) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  return null;
}
