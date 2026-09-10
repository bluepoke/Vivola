import { NextResponse } from "next/server";
import { requireLecturer } from "@/lib/auth/session";

export async function GET() {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({ lecturer });
}
