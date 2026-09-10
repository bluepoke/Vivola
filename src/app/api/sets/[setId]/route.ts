import { NextResponse } from "next/server";
import { deleteSet, getSet } from "@/lib/sets/set-service";
import { setServiceErrorResponse } from "@/lib/sets/http-errors";
import { requireLecturer } from "@/lib/auth/session";

export async function GET(_request: Request, { params }: { params: Promise<{ setId: string }> }) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { setId } = await params;

  try {
    const set = await getSet(lecturer.id, setId);
    return NextResponse.json({ set });
  } catch (error) {
    const response = setServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ setId: string }> }
) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { setId } = await params;

  try {
    await deleteSet(lecturer.id, setId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const response = setServiceErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
