import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { findLecturerById, type Lecturer } from "@/lib/auth/lecturer-auth";
import { createSessionOptions } from "@/lib/auth/iron-session-options";

export type SessionData = {
  lecturerId?: string;
};

const sessionOptions = createSessionOptions("vivola_session");

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

// Used from both Server Components and Route Handlers, so it must never
// write cookies — Next.js only allows cookie mutation from Route
// Handlers/Server Actions, and would throw if called during a page render.
// A session pointing at a deleted Lecturer is treated as logged out; the
// stale cookie is overwritten the next time the browser logs in.
export async function requireLecturer(): Promise<Lecturer | null> {
  const session = await getSession();
  if (!session.lecturerId) {
    return null;
  }

  return findLecturerById(session.lecturerId);
}
