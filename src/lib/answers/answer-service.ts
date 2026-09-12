import { prisma } from "@/lib/db/client";
import { Prisma, type QuestionType } from "@prisma/client";
import { NotFoundError, SessionEndedError } from "@/lib/errors";

export { NotFoundError, SessionEndedError };
export class NoOpenQuestionError extends Error {}
export class InvalidAnswerOptionError extends Error {}
export class AlreadyAnsweredError extends Error {}

export type AnswerView = {
  id: string;
  sessionQuestionId: string;
  studentId: string;
  answerOptionIds: string[];
};

function toAnswerView(answer: {
  id: string;
  sessionQuestionId: string;
  studentId: string;
  selections: { answerOptionId: string }[];
}): AnswerView {
  return {
    id: answer.id,
    sessionQuestionId: answer.sessionQuestionId,
    studentId: answer.studentId,
    answerOptionIds: answer.selections.map((selection) => selection.answerOptionId),
  };
}

// Locks in a Student's one-time Answer to whichever Question is currently
// open for the Session. The compound unique constraint on Answer enforces
// "at most one Answer per Student per Question" even under a race between
// two concurrent submissions; there is no update path by design (see
// CONTEXT.md's Answer definition — an Answer cannot be changed once submitted).
// A single-select Question requires exactly one answerOptionId; a
// multi-select Question accepts one or more, each becoming its own
// AnswerSelection row (see ticket #10 / the multi-select data model).
export async function submitAnswer(
  sessionId: string,
  studentId: string,
  input: { answerOptionIds: string[] }
): Promise<AnswerView> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.sessionId !== sessionId) {
    throw new NotFoundError(`No Student ${studentId} found in this Session`);
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    throw new NotFoundError(`No Session ${sessionId} found`);
  }
  if (session.endedAt) {
    throw new SessionEndedError("This Session has already ended");
  }
  if (!session.openQuestionId) {
    throw new NoOpenQuestionError("No Question is currently open for this Session");
  }

  const uniqueOptionIds = Array.from(new Set(input.answerOptionIds));
  if (uniqueOptionIds.length === 0) {
    throw new InvalidAnswerOptionError("At least one answer option must be selected");
  }

  const question = await prisma.sessionQuestion.findUnique({
    where: { id: session.openQuestionId },
  });
  if (question?.type === "SINGLE_SELECT" && uniqueOptionIds.length > 1) {
    throw new InvalidAnswerOptionError("This Question only accepts a single selected option");
  }

  const options = await prisma.sessionAnswerOption.findMany({
    where: { id: { in: uniqueOptionIds } },
  });
  const validOptions = options.filter((option) => option.sessionQuestionId === session.openQuestionId);
  if (validOptions.length !== uniqueOptionIds.length) {
    throw new InvalidAnswerOptionError("That answer option does not belong to the open Question");
  }

  try {
    const answer = await prisma.answer.create({
      data: {
        sessionQuestionId: session.openQuestionId,
        studentId,
        selections: {
          create: uniqueOptionIds.map((answerOptionId) => ({ answerOptionId })),
        },
      },
      include: { selections: true },
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
    include: { selections: true },
  });
  return answer ? toAnswerView(answer) : null;
}

export async function getAnswerCount(sessionQuestionId: string): Promise<number> {
  return prisma.answer.count({ where: { sessionQuestionId } });
}

export type AnalysisOptionView = { id: string; text: string; count: number; isCorrect: boolean };
export type QuestionAnalysisView = {
  id: string;
  prompt: string;
  type: QuestionType;
  options: AnalysisOptionView[];
  totalAnswered: number;
};

// Builds the per-Question Analysis: the answer distribution, and (for a
// Question Set) the correct answer. Takes the closed Question's structural
// shape (as returned by session-service's closeQuestion) rather than
// re-fetching it, since counting Answers is this module's own concern.
// A Student who submitted no Answer is naturally excluded — they have no
// Answer row to count (see CONTEXT.md's Answer definition). A Student who
// selected multiple options on a multi-select Question counts toward each
// of their selected options' bars, but only once toward totalAnswered.
export async function getQuestionAnalysis(question: {
  id: string;
  prompt: string;
  type: QuestionType;
  options: { id: string; text: string; isCorrect: boolean }[];
}): Promise<QuestionAnalysisView> {
  const answers = await prisma.answer.findMany({
    where: { sessionQuestionId: question.id },
    include: { selections: true },
  });

  const countByOption = new Map<string, number>();
  for (const answer of answers) {
    for (const selection of answer.selections) {
      countByOption.set(
        selection.answerOptionId,
        (countByOption.get(selection.answerOptionId) ?? 0) + 1
      );
    }
  }

  const options = question.options.map((option) => ({
    id: option.id,
    text: option.text,
    isCorrect: option.isCorrect,
    count: countByOption.get(option.id) ?? 0,
  }));

  return {
    id: question.id,
    prompt: question.prompt,
    type: question.type,
    options,
    totalAnswered: answers.length,
  };
}
