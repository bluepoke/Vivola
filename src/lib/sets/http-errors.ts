import { NextResponse } from "next/server";
import { InvalidInputError, NotFoundError } from "@/lib/sets/set-service";

export function setServiceErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof InvalidInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return null;
}
