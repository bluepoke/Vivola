import { NextResponse } from "next/server";
import {
  InvalidInputError,
  JoiningClosedError,
  NicknameTakenError,
  NotFoundError,
  SessionEndedError,
} from "@/lib/students/student-service";

export function studentServiceErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof InvalidInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (
    error instanceof NicknameTakenError ||
    error instanceof JoiningClosedError ||
    error instanceof SessionEndedError
  ) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return null;
}
