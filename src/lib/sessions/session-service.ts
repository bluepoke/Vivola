import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { Prisma, type DisplayMode, type QuestionType, type SetType } from "@prisma/client";
import { NotFoundError, SessionEndedError } from "@/lib/errors";
import { getSet } from "@/lib/sets/set-service";

export { NotFoundError, SessionEndedError };
export class AlreadyActiveSessionError extends Error {}
export class QuestionAlreadyOpenError extends Error {}
export class OutOfOrderQuestionError extends Error {}
export class QuestionNotOpenError extends Error {}
export class QuestionNotClosedError extends Error {}
export class NoNextQuestionError extends Error {}

export type { DisplayMode, QuestionType, SetType };

export type SessionOptionView = { id: string; text: string; isCorrect: boolean };
export type SessionQuestionView = {
  id: string;
  prompt: string;
  type: QuestionType;
  options: SessionOptionView[];
};
export function sessionTypeLabel(type: SetType): string {
  return type === "SURVEY" ? "Survey Session" : "Quiz Session";
}

export type SessionView = {
  id: string;
  lecturerId: string;
  type: SetType;
  title: string;
  displayMode: DisplayMode;
  joinCode: string;
  questions: SessionQuestionView[];
  openQuestion: SessionQuestionView | null;
  closedQuestion: SessionQuestionView | null;
  ended: boolean;
};

// Unlike SessionOptionView, this omits isCorrect: it's shown to Students and
// on the Presentation view while a Quiz Session Question is still open, and
// must not leak the correct answer before the Question closes — at which
// point closedQuestion (below) reveals it as part of the Analysis.
export type PublicOptionView = { id: string; text: string };
export type PublicQuestionView = {
  id: string;
  prompt: string;
  type: QuestionType;
  options: PublicOptionView[];
};
export type PublicSessionView = {
  id: string;
  type: SetType;
  title: string;
  joinCode: string;
  joiningClosed: boolean;
  openQuestion: PublicQuestionView | null;
  // Unlike openQuestion, this reveals isCorrect: the Question is closed, so
  // no further Answers can change its outcome, and Analysis (which must show
  // the correct answer for a Question Set) depends on it.
  closedQuestion: SessionQuestionView | null;
  ended: boolean;
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
  closedQuestionId: string | null;
  endedAt: Date | null;
  questions: {
    id: string;
    prompt: string;
    type: QuestionType;
    options: { id: string; text: string; isCorrect: boolean }[];
  }[];
};

function toSessionQuestionView(question: {
  id: string;
  prompt: string;
  type: QuestionType;
  options: { id: string; text: string; isCorrect: boolean }[];
}): SessionQuestionView {
  return {
    id: question.id,
    prompt: question.prompt,
    type: question.type,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  };
}

function toSessionView(session: SessionRecord): SessionView {
  const questions = session.questions.map(toSessionQuestionView);

  return {
    id: session.id,
    lecturerId: session.lecturerId,
    type: session.type,
    title: session.title,
    displayMode: session.displayMode,
    joinCode: session.joinCode,
    questions,
    openQuestion: questions.find((question) => question.id === session.openQuestionId) ?? null,
    closedQuestion: questions.find((question) => question.id === session.closedQuestionId) ?? null,
    ended: session.endedAt !== null,
  };
}

function toPublicSessionView(
  session: SessionRecord & { firstQuestionOpenedAt: Date | null }
): PublicSessionView {
  const questions = session.questions.map(toSessionQuestionView);
  const openQuestion = questions.find((question) => question.id === session.openQuestionId);

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
          type: openQuestion.type,
          options: openQuestion.options.map((option) => ({ id: option.id, text: option.text })),
        }
      : null,
    closedQuestion: questions.find((question) => question.id === session.closedQuestionId) ?? null,
    ended: session.endedAt !== null,
  };
}

export async function startSession(
  lecturerId: string,
  input: { setId: string; displayMode: DisplayMode }
): Promise<SessionView> {
  const set = await getSet(lecturerId, input.setId);

  const session = await runTransactionWithRetry(async (tx) => {
    const active = await tx.session.findFirst({ where: { lecturerId, endedAt: null } });
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
            type: question.type,
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

  // An ended Session's Questions, Answers, and Analyses must persist for
  // later Lecturer review (see CONTEXT.md) — cancelling (a hard delete) is
  // only for abandoning a Session before or during its run, not after.
  if (session.endedAt) {
    throw new SessionEndedError("This Session has already ended and can no longer be cancelled");
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
  const session = await prisma.session.findFirst({ where: { lecturerId, endedAt: null } });
  return session ? { id: session.id, title: session.title } : null;
}

// A lightweight scalar-only lookup for callers that only need the Session's
// type (e.g. deciding whether to compute a Leaderboard) and would otherwise
// have to pay for a full sessionInclude fetch of every Question and option.
export async function getSessionType(lecturerId: string, sessionId: string): Promise<SetType> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { lecturerId: true, type: true },
  });
  if (!session || session.lecturerId !== lecturerId) {
    throw new NotFoundError(`No Session ${sessionId} found for this Lecturer`);
  }
  return session.type;
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
// (see CONTEXT.md). This command only ever opens the first Question — once
// closeQuestion has closed it, nextQuestion (below) takes over for the rest
// of the Session's Questions.
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

  if (session.endedAt) {
    throw new SessionEndedError("This Session has already ended");
  }

  if (session.openQuestionId) {
    throw new QuestionAlreadyOpenError("A Question is already open for this Session");
  }

  if (session.closedQuestionId) {
    throw new OutOfOrderQuestionError(
      "The first Question has already been closed; use nextQuestion to advance"
    );
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
  // count 0. This also absorbs the Session being cancelled or ended in the
  // same gap (0 rows match) instead of throwing an unhandled not-found error
  // or opening a Question for an already-ended Session.
  const result = await prisma.session.updateMany({
    where: { id: sessionId, openQuestionId: null, endedAt: null },
    data: {
      openQuestionId: question.id,
      firstQuestionOpenedAt: session.firstQuestionOpenedAt ?? new Date(),
    },
  });
  if (result.count === 0) {
    throw new QuestionAlreadyOpenError("A Question is already open for this Session");
  }

  return toSessionQuestionView(question);
}

// Closes the Session's currently open Question: no further Answers are
// accepted for it (submitAnswer requires openQuestionId), and it becomes the
// Session's closedQuestion — the Question whose Analysis is now displayed on
// the Presentation view and mirrored to each Student, until the Lecturer
// calls nextQuestion.
export async function closeQuestion(lecturerId: string, sessionId: string): Promise<SessionQuestionView> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
  if (!session || session.lecturerId !== lecturerId) {
    throw new NotFoundError(`No Session ${sessionId} found for this Lecturer`);
  }

  if (session.endedAt) {
    throw new SessionEndedError("This Session has already ended");
  }

  if (!session.openQuestionId) {
    throw new QuestionNotOpenError("No Question is currently open for this Session");
  }

  const question = session.questions.find((q) => q.id === session.openQuestionId)!;

  // Conditioned on openQuestionId still matching and the Session still not
  // ended, mirroring the same race guard as openQuestion: only one
  // concurrent close can win, and a concurrent endSession blocks this one.
  const result = await prisma.session.updateMany({
    where: { id: sessionId, openQuestionId: session.openQuestionId, endedAt: null },
    data: { openQuestionId: null, closedQuestionId: question.id },
  });
  if (result.count === 0) {
    throw new QuestionNotOpenError("No Question is currently open for this Session");
  }

  return toSessionQuestionView(question);
}

// Advances from the closed Question's Analysis to the next Question in the
// Set's fixed authoring-time order, opening it the same way openQuestion
// does. There is no reorder/skip command (see CONTEXT.md).
export async function nextQuestion(lecturerId: string, sessionId: string): Promise<SessionQuestionView> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
  if (!session || session.lecturerId !== lecturerId) {
    throw new NotFoundError(`No Session ${sessionId} found for this Lecturer`);
  }

  if (session.endedAt) {
    throw new SessionEndedError("This Session has already ended");
  }

  if (!session.closedQuestionId) {
    throw new QuestionNotClosedError("Close the currently open Question before advancing");
  }

  const closedIndex = session.questions.findIndex((q) => q.id === session.closedQuestionId);
  const next = session.questions[closedIndex + 1];
  if (!next) {
    throw new NoNextQuestionError("This Session has no further Questions");
  }

  // Conditioned on closedQuestionId still matching, openQuestionId still
  // null, and the Session still not ended, mirroring the same race guard as
  // openQuestion/closeQuestion.
  const result = await prisma.session.updateMany({
    where: {
      id: sessionId,
      closedQuestionId: session.closedQuestionId,
      openQuestionId: null,
      endedAt: null,
    },
    data: { openQuestionId: next.id, closedQuestionId: null },
  });
  if (result.count === 0) {
    throw new QuestionNotClosedError("Close the currently open Question before advancing");
  }

  return toSessionQuestionView(next);
}

export type PastSessionSummary = {
  id: string;
  title: string;
  type: SetType;
  endedAt: Date;
};

export type PastSessionGroup = {
  id: string;
  setId: string | null;
  setTitle: string;
  sessions: PastSessionSummary[];
};

// The Lecturer's ended Sessions, for later review (see CONTEXT.md), grouped
// by the Set each one ran and ordered by each group's most recently ended
// Session. `setTitle` is the Set's *current* title (falling back to the
// Session's own snapshotted title once the Set has been deleted, setId
// null per the Session model's onDelete: SetNull) — so a list item's own
// title can differ from its group's heading if the Set was renamed between
// runs, which is expected: the group heading identifies the Set as it is
// now, while each item preserves what it was actually called at the time
// (see ADR 0001). Two Sessions whose *different* source Sets have both since
// been deleted can never be merged back together, even if those Sets once
// shared a name: onDelete: SetNull discards the Set's id along with the row,
// so nothing survives to prove they were the same Set — each becomes its own
// single-Session group instead.
export async function listPastSessionsForLecturer(lecturerId: string): Promise<PastSessionGroup[]> {
  const sessions = await prisma.session.findMany({
    where: { lecturerId, endedAt: { not: null } },
    orderBy: { endedAt: "desc" },
    include: { set: { select: { id: true, title: true } } },
  });

  const groupById = new Map<string, PastSessionGroup>();

  for (const session of sessions) {
    const id = session.set ? session.set.id : session.id;
    let group = groupById.get(id);
    if (!group) {
      group = {
        id,
        setId: session.set?.id ?? null,
        setTitle: session.set?.title ?? session.title,
        sessions: [],
      };
      groupById.set(id, group);
    }
    group.sessions.push({
      id: session.id,
      title: session.title,
      type: session.type,
      endedAt: session.endedAt!,
    });
  }

  return Array.from(groupById.values());
}

// The Lecturer explicitly concludes the Session, at any point in its
// lifecycle — before, during, or after its Questions. Unlike cancelSession,
// this never deletes the Session: its Questions, Answers, and Analyses must
// persist for later Lecturer review (see CONTEXT.md). Once ended, no further
// open/close/next/answer command is accepted (see the endedAt guards above
// and in answer-service's submitAnswer), and the Lecturer is freed to start
// a new Session (see getActiveSessionForLecturer and startSession above).
export async function endSession(lecturerId: string, sessionId: string): Promise<void> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.lecturerId !== lecturerId) {
    throw new NotFoundError(`No Session ${sessionId} found for this Lecturer`);
  }

  if (session.endedAt) {
    throw new SessionEndedError("This Session has already ended");
  }

  // Conditioned on endedAt still being null, mirroring the same race guard
  // as openQuestion/closeQuestion/nextQuestion.
  const result = await prisma.session.updateMany({
    where: { id: sessionId, endedAt: null },
    data: { endedAt: new Date() },
  });
  if (result.count === 0) {
    throw new SessionEndedError("This Session has already ended");
  }
}
