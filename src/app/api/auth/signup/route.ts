import { NextResponse } from "next/server";
import {
  DuplicateEmailError,
  InvalidInputError,
  signUp,
} from "@/lib/auth/lecturer-auth";
import { parseCredentials } from "@/lib/auth/request-body";
import { getSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const credentials = await parseCredentials(request);
  if (!credentials) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  try {
    const lecturer = await signUp(credentials);

    const session = await getSession();
    session.lecturerId = lecturer.id;
    await session.save();

    return NextResponse.json({ lecturer }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof DuplicateEmailError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
