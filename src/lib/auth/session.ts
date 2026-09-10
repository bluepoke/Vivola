import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { findLecturerById, type Lecturer } from "@/lib/auth/lecturer-auth";

export type SessionData = {
  lecturerId?: string;
};

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to a string of at least 32 characters");
  }
  return secret;
}

const sessionOptions: SessionOptions = {
  get password() {
    return sessionSecret();
  },
  cookieName: "vivola_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

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
