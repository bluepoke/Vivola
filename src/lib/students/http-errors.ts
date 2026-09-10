import { NextResponse } from "next/server";
import { InvalidInputError, NicknameTakenError, NotFoundError } from "@/lib/students/student-service";

export function studentServiceErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof InvalidInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof NicknameTakenError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return null;
}
