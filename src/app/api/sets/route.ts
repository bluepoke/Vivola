import { NextResponse } from "next/server";
import { createSet, listSets } from "@/lib/sets/set-service";
import { setServiceErrorResponse } from "@/lib/sets/http-errors";
import { requireLecturer } from "@/lib/auth/session";

export async function GET() {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sets = await listSets(lecturer.id);
  return NextResponse.json({ sets });
}

export async function POST(request: Request) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || (body.type !== "SURVEY" && body.type !== "QUESTION") || typeof body.title !== "string") {
    return NextResponse.json(
      { error: "type ('SURVEY' or 'QUESTION') and title are required" },
      { status: 400 }
    );
  }

  try {
    const set = await createSet(lecturer.id, { type: body.type, title: body.title });
    return NextResponse.json({ set }, { status: 201 });
  } catch (error) {
    const response = setServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
