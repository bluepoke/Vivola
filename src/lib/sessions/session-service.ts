import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { Prisma, type DisplayMode, type SetType } from "@prisma/client";
import { NotFoundError } from "@/lib/errors";
import { getSet } from "@/lib/sets/set-service";

export { NotFoundError };
export class AlreadyActiveSessionError extends Error {}
export class QuestionAlreadyOpenError extends Error {}
export class OutOfOrderQuestionError extends Error {}

export type { DisplayMode, SetType };

export type SessionOptionView = { id: string; text: string; isCorrect: boolean };
export type SessionQuestionView = { id: string; prompt: string; options: SessionOptionView[] };
export type SessionView = {
  id: string;
  lecturerId: string;
  type: SetType;
  title: string;
  displayMode: DisplayMode;
  joinCode: string;
  questions: SessionQuestionView[];
  openQuestion: SessionQuestionView | null;
};

// Unlike SessionOptionView, this omits isCorrect: it's shown to Students and
// on the Presentation view while a Quiz Session Question is still open, and
// must not leak the correct answer before the Question closes and its
// Analysis is revealed (a later ticket).
export type PublicOptionView = { id: string; text: string };
export type PublicQuestionView = { id: string; prompt: string; options: PublicOptionView[] };
export type PublicSessionView = {
  id: string;
  type: SetType;
  title: string;
  joinCode: string;
  joiningClosed: boolean;
  openQuestion: PublicQuestionView | null;
};

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const JOIN_CODE_LENGTH = 6;
const MAX_TRANSACTION_ATTEMPTS = 5;

function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

// Retries on Postgres serialization failures (P2034, e.g. two concurrent
// startSession calls for the same Lecturer) and on join-code collisions
// (P2002), regenerating the join code each attempt.
async function runTransactionWithRetry<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002");
      if (!retryable || attempt === MAX_TRANSACTION_ATTEMPTS) {
        throw error;
      }
    }
  }
  throw new Error("unreachable");
}

const sessionInclude = {
  questions: {
    orderBy: { order: "asc" as const },
    include: { options: { orderBy: { order: "asc" as const } } },
  },
};

type SessionRecord = {
  id: string;
  lecturerId: string;
  type: SetType;
  title: string;
  displayMode: DisplayMode;
  joinCode: string;
  openQuestionId: string | null;
  questions: {
    id: string;
    prompt: string;
    options: { id: string; text: string; isCorrect: boolean }[];
  }[];
};

function toSessionView(session: SessionRecord): SessionView {
  const questions = session.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  }));

  return {
    id: session.id,
    lecturerId: session.lecturerId,
    type: session.type,
    title: session.title,
    displayMode: session.displayMode,
    joinCode: session.joinCode,
    questions,
    openQuestion: questions.find((question) => question.id === session.openQuestionId) ?? null,
  };
}

function toPublicSessionView(
  session: SessionRecord & { firstQuestionOpenedAt: Date | null }
): PublicSessionView {
  const openQuestion = session.questions.find((question) => question.id === session.openQuestionId);

  return {
    id: session.id,
    type: session.type,
    title: session.title,
    joinCode: session.joinCode,
    joiningClosed: session.firstQuestionOpenedAt !== null,
    openQuestion: openQuestion
      ? {
          id: openQuestion.id,
          prompt: openQuestion.prompt,
          options: openQuestion.options.map((option) => ({ id: option.id, text: option.text })),
        }
      : null,
  };
}

export async function startSession(
  lecturerId: string,
  input: { setId: string; displayMode: DisplayMode }
): Promise<SessionView> {
  const set = await getSet(lecturerId, input.setId);

  const session = await runTransactionWithRetry(async (tx) => {
    const active = await tx.session.findFirst({ where: { lecturerId } });
    if (active) {
      throw new AlreadyActiveSessionError(
        "This Lecturer already has an active Session; end it before starting another"
      );
    }

    return tx.session.create({
      data: {
        lecturerId,
        setId: set.id,
        type: set.type,
        title: set.title,
        displayMode: input.displayMode,
        joinCode: generateJoinCode(),
        questions: {
          create: set.questions.map((question, questionIndex) => ({
            prompt: question.prompt,
            order: questionIndex,
            options: {
              create: question.options.map((option, optionIndex) => ({
                text: option.text,
                isCorrect: option.isCorrect,
                order: optionIndex,
              })),
            },
          })),
        },
      },
      include: sessionInclude,
    });
  });

  return toSessionView(session);
}

export async function getSession(lecturerId: string, sessionId: string): Promise<SessionView> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });

  if (!session || session.lecturerId !== lecturerId) {
    throw new NotFoundError(`No Session ${sessionId} found for this Lecturer`);
  }

  return toSessionView(session);
}

export async function cancelSession(lecturerId: string, sessionId: string): Promise<void> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.lecturerId !== lecturerId) {
    throw new NotFoundError(`No Session ${sessionId} found for this Lecturer`);
  }

  try {
    await prisma.session.delete({ where: { id: sessionId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new NotFoundError(`No Session ${sessionId} found for this Lecturer`);
    }
    throw error;
  }
}

export async function getActiveSessionForLecturer(
  lecturerId: string
): Promise<{ id: string; title: string } | null> {
  const session = await prisma.session.findFirst({ where: { lecturerId } });
  return session ? { id: session.id, title: session.title } : null;
}

export async function getPublicSession(sessionId: string): Promise<PublicSessionView> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
  if (!session) {
    throw new NotFoundError(`No Session ${sessionId} found`);
  }
  return toPublicSessionView(session);
}

export async function getSessionByJoinCode(joinCode: string): Promise<PublicSessionView> {
  const session = await prisma.session.findUnique({
    where: { joinCode },
    include: sessionInclude,
  });
  if (!session) {
    throw new NotFoundError(`No Session found for join code ${joinCode}`);
  }
  return toPublicSessionView(session);
}

// Opens the given Question for the Session, displaying it (and its options)
// on the Presentation view and every joined Student's device, and — if it's
// the Session's first Question — permanently closing joining. Questions must
// be opened in their fixed authoring order; there is no reorder/skip command
// (see CONTEXT.md), and only the first Question can be opened until closing
// a Question (a later ticket) clears openQuestionId.
export async function openQuestion(
  lecturerId: string,
  sessionId: string,
  questionId: string
): Promise<SessionQuestionView> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
  if (!session || session.lecturerId !== lecturerId) {
    throw new NotFoundError(`No Session ${sessionId} found for this Lecturer`);
  }

  if (session.openQuestionId) {
    throw new QuestionAlreadyOpenError("A Question is already open for this Session");
  }

  const question = session.questions.find((q) => q.id === questionId);
  if (!question) {
    throw new NotFoundError(`No Question ${questionId} found in this Session`);
  }

  const firstQuestion = session.questions[0];
  if (!firstQuestion || question.id !== firstQuestion.id) {
    throw new OutOfOrderQuestionError("Questions must be opened in order, starting with the first");
  }

  // Conditioned on openQuestionId still being null so two concurrent calls
  // can't both open a Question: only one update matches and the other sees
  // count 0. This also absorbs the Session being cancelled in the same gap
  // (0 rows match) instead of throwing an unhandled not-found error.
  const result = await prisma.session.updateMany({
    where: { id: sessionId, openQuestionId: null },
    data: {
      openQuestionId: question.id,
      firstQuestionOpenedAt: session.firstQuestionOpenedAt ?? new Date(),
    },
  });
  if (result.count === 0) {
    throw new QuestionAlreadyOpenError("A Question is already open for this Session");
  }

  return {
    id: question.id,
    prompt: question.prompt,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  };
}
