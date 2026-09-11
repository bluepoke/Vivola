import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import { NotFoundError } from "@/lib/errors";

export { NotFoundError };
export class NoOpenQuestionError extends Error {}
export class InvalidAnswerOptionError extends Error {}
export class AlreadyAnsweredError extends Error {}

export type AnswerView = {
  id: string;
  sessionQuestionId: string;
  studentId: string;
  answerOptionId: string;
};

function toAnswerView(answer: {
  id: string;
  sessionQuestionId: string;
  studentId: string;
  answerOptionId: string;
}): AnswerView {
  return {
    id: answer.id,
    sessionQuestionId: answer.sessionQuestionId,
    studentId: answer.studentId,
    answerOptionId: answer.answerOptionId,
  };
}

// Locks in a Student's one-time Answer to whichever Question is currently
// open for the Session. The compound unique constraint on Answer enforces
// "at most one Answer per Student per Question" even under a race between
// two concurrent submissions; there is no update path by design (see
// CONTEXT.md's Answer definition — an Answer cannot be changed once submitted).
export async function submitAnswer(
  sessionId: string,
  studentId: string,
  input: { answerOptionId: string }
): Promise<AnswerView> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.sessionId !== sessionId) {
    throw new NotFoundError(`No Student ${studentId} found in this Session`);
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    throw new NotFoundError(`No Session ${sessionId} found`);
  }
  if (!session.openQuestionId) {
    throw new NoOpenQuestionError("No Question is currently open for this Session");
  }

  const option = await prisma.sessionAnswerOption.findUnique({
    where: { id: input.answerOptionId },
  });
  if (!option || option.sessionQuestionId !== session.openQuestionId) {
    throw new InvalidAnswerOptionError("That answer option does not belong to the open Question");
  }

  try {
    const answer = await prisma.answer.create({
      data: {
        sessionQuestionId: session.openQuestionId,
        studentId,
        answerOptionId: option.id,
      },
    });
    return toAnswerView(answer);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new AlreadyAnsweredError("This Student has already submitted an Answer to this Question");
      }
      // The Lecturer cancelled the Session in the gap between the checks
      // above and this insert, so the foreign keys it points at are gone.
      if (error.code === "P2003") {
        throw new NotFoundError(`No Session ${sessionId} found`);
      }
    }
    throw error;
  }
}

export async function getAnswerForStudent(
  sessionQuestionId: string,
  studentId: string
): Promise<AnswerView | null> {
  const answer = await prisma.answer.findUnique({
    where: { sessionQuestionId_studentId: { sessionQuestionId, studentId } },
  });
  return answer ? toAnswerView(answer) : null;
}

export async function getAnswerCount(sessionQuestionId: string): Promise<number> {
  return prisma.answer.count({ where: { sessionQuestionId } });
}
