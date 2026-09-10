import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import { InvalidInputError, NotFoundError } from "@/lib/errors";
import { getSessionByJoinCode } from "@/lib/sessions/session-service";

export { InvalidInputError, NotFoundError };
export class NicknameTakenError extends Error {}

export type StudentView = { id: string; sessionId: string; nickname: string | null };

function toStudentView(student: { id: string; sessionId: string; nickname: string | null }): StudentView {
  return { id: student.id, sessionId: student.sessionId, nickname: student.nickname };
}

export async function joinSessionByJoinCode(
  joinCode: string,
  input: { nickname?: string }
): Promise<StudentView> {
  const session = await getSessionByJoinCode(joinCode);

  let nickname: string | null = null;
  if (session.type === "QUESTION") {
    const trimmed = (input.nickname ?? "").trim();
    if (!trimmed) {
      throw new InvalidInputError("Choose a nickname to join this Quiz Session");
    }
    nickname = trimmed;
  }

  try {
    const student = await prisma.student.create({
      data: { sessionId: session.id, nickname },
    });
    return toStudentView(student);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new NicknameTakenError(`The nickname "${nickname}" is already taken in this Session`);
      }
      // The Lecturer cancelled the Session in the gap between the join-code
      // lookup above and this insert, so the foreign key it points at is gone.
      if (error.code === "P2003") {
        throw new NotFoundError(`No Session found for join code ${joinCode}`);
      }
    }
    throw error;
  }
}

export async function getStudentInSession(
  sessionId: string,
  studentId: string
): Promise<StudentView | null> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.sessionId !== sessionId) {
    return null;
  }
  return toStudentView(student);
}

export async function getStudentCount(sessionId: string): Promise<number> {
  return prisma.student.count({ where: { sessionId } });
}
