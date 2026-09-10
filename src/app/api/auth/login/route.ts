import { NextResponse } from "next/server";
import { InvalidCredentialsError, logIn } from "@/lib/auth/lecturer-auth";
import { parseCredentials } from "@/lib/auth/request-body";
import { getSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const credentials = await parseCredentials(request);
  if (!credentials) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  try {
    const lecturer = await logIn(credentials);

    const session = await getSession();
    session.lecturerId = lecturer.id;
    await session.save();

    return NextResponse.json({ lecturer }, { status: 200 });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
}
