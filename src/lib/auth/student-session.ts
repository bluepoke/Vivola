import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { createSessionOptions } from "@/lib/auth/iron-session-options";

export type StudentSessionData = {
  sessionId?: string;
  studentId?: string;
};

const sessionOptions = createSessionOptions("vivola_student_session");

// Only the most recent join is remembered — a Student is only ever watching
// one lobby/Session at a time, so a later join simply replaces the earlier
// one rather than accumulating a history.
export async function getJoinedStudent(): Promise<{ sessionId: string; studentId: string } | null> {
  const session = await getIronSession<StudentSessionData>(await cookies(), sessionOptions);
  if (!session.sessionId || !session.studentId) {
    return null;
  }
  return { sessionId: session.sessionId, studentId: session.studentId };
}

// Must only be called from a Route Handler/Server Action — Next.js forbids
// writing cookies during a page render.
export async function setJoinedStudent(sessionId: string, studentId: string): Promise<void> {
  const session = await getIronSession<StudentSessionData>(await cookies(), sessionOptions);
  session.sessionId = sessionId;
  session.studentId = studentId;
  await session.save();
}
