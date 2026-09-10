import { prisma } from "@/lib/db/client";
import { Prisma, type SetType } from "@prisma/client";

export class InvalidInputError extends Error {}
export class NotFoundError extends Error {}

export type { SetType };

export type AnswerOptionInput = { text: string; isCorrect?: boolean };
export type QuestionInput = { prompt: string; options: AnswerOptionInput[] };

export type AnswerOptionView = { id: string; text: string; isCorrect: boolean };
export type QuestionView = { id: string; prompt: string; options: AnswerOptionView[] };
export type SetView = {
  id: string;
  lecturerId: string;
  type: SetType;
  title: string;
  questions: QuestionView[];
};
export type SetSummary = {
  id: string;
  type: SetType;
  title: string;
  questionCount: number;
  createdAt: Date;
};

const questionInclude = {
  options: { orderBy: { order: "asc" as const } },
};

const MAX_SERIALIZABLE_ATTEMPTS = 3;

// Retries on Postgres serialization failures (Prisma P2034) from concurrent
// requests racing on the same Set, e.g. two Questions computing the same
// next `order`, or a reorder racing an add/delete.
async function runSerializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const isSerializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!isSerializationConflict || attempt === MAX_SERIALIZABLE_ATTEMPTS) {
        throw error;
      }
    }
  }
  throw new Error("unreachable");
}

function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

function toQuestionView(question: {
  id: string;
  prompt: string;
  options: { id: string; text: string; isCorrect: boolean }[];
}): QuestionView {
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

function validateQuestionInput(setType: SetType, input: QuestionInput): void {
  if (!input.prompt.trim()) {
    throw new InvalidInputError("A question's prompt cannot be empty");
  }
  if (input.options.length < 2) {
    throw new InvalidInputError("A question needs at least two answer options");
  }
  if (input.options.some((option) => !option.text.trim())) {
    throw new InvalidInputError("An answer option's text cannot be empty");
  }

  const correctCount = input.options.filter((option) => option.isCorrect).length;

  if (setType === "SURVEY" && correctCount > 0) {
    throw new InvalidInputError("Survey Set questions cannot have a correct answer marked");
  }
  if (setType === "QUESTION" && correctCount !== 1) {
    throw new InvalidInputError(
      "Question Set questions must have exactly one correct answer marked"
    );
  }
}

async function findOwnedSet(lecturerId: string, setId: string) {
  const set = await prisma.set.findUnique({ where: { id: setId } });
  if (!set || set.lecturerId !== lecturerId) {
    throw new NotFoundError(`No Set ${setId} found for this Lecturer`);
  }
  return set;
}

async function findOwnedQuestion(lecturerId: string, setId: string, questionId: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { set: true },
  });
  if (!question || question.set.lecturerId !== lecturerId || question.setId !== setId) {
    throw new NotFoundError(`No Question ${questionId} found in Set ${setId} for this Lecturer`);
  }
  return question;
}

export async function createSet(
  lecturerId: string,
  input: { type: SetType; title: string }
): Promise<SetSummary> {
  const title = input.title.trim();
  if (!title) {
    throw new InvalidInputError("A Set's title cannot be empty");
  }

  const set = await prisma.set.create({
    data: { lecturerId, type: input.type, title },
  });

  return { id: set.id, type: set.type, title: set.title, questionCount: 0, createdAt: set.createdAt };
}

export async function listSets(lecturerId: string): Promise<SetSummary[]> {
  const sets = await prisma.set.findMany({
    where: { lecturerId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return sets.map((set) => ({
    id: set.id,
    type: set.type,
    title: set.title,
    questionCount: set._count.questions,
    createdAt: set.createdAt,
  }));
}

export async function getSet(lecturerId: string, setId: string): Promise<SetView> {
  const set = await prisma.set.findUnique({
    where: { id: setId },
    include: { questions: { orderBy: { order: "asc" }, include: questionInclude } },
  });

  if (!set || set.lecturerId !== lecturerId) {
    throw new NotFoundError(`No Set ${setId} found for this Lecturer`);
  }

  return {
    id: set.id,
    lecturerId: set.lecturerId,
    type: set.type,
    title: set.title,
    questions: set.questions.map(toQuestionView),
  };
}

export async function deleteSet(lecturerId: string, setId: string): Promise<void> {
  await findOwnedSet(lecturerId, setId);
  try {
    await prisma.set.delete({ where: { id: setId } });
  } catch (error) {
    if (isRecordNotFound(error)) {
      throw new NotFoundError(`No Set ${setId} found for this Lecturer`);
    }
    throw error;
  }
}

export async function addQuestion(
  lecturerId: string,
  setId: string,
  input: QuestionInput
): Promise<QuestionView> {
  const set = await findOwnedSet(lecturerId, setId);
  validateQuestionInput(set.type, input);

  const question = await runSerializable(async (tx) => {
    const lastQuestion = await tx.question.findFirst({
      where: { setId },
      orderBy: { order: "desc" },
    });
    const nextOrder = (lastQuestion?.order ?? -1) + 1;

    return tx.question.create({
      data: {
        setId,
        prompt: input.prompt.trim(),
        order: nextOrder,
        options: {
          create: input.options.map((option, index) => ({
            text: option.text.trim(),
            isCorrect: Boolean(option.isCorrect),
            order: index,
          })),
        },
      },
      include: questionInclude,
    });
  });

  return toQuestionView(question);
}

export async function updateQuestion(
  lecturerId: string,
  setId: string,
  questionId: string,
  input: QuestionInput
): Promise<QuestionView> {
  const question = await findOwnedQuestion(lecturerId, setId, questionId);
  validateQuestionInput(question.set.type, input);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.answerOption.deleteMany({ where: { questionId } });
      return tx.question.update({
        where: { id: questionId },
        data: {
          prompt: input.prompt.trim(),
          options: {
            create: input.options.map((option, index) => ({
              text: option.text.trim(),
              isCorrect: Boolean(option.isCorrect),
              order: index,
            })),
          },
        },
        include: questionInclude,
      });
    });

    return toQuestionView(updated);
  } catch (error) {
    if (isRecordNotFound(error)) {
      throw new NotFoundError(`No Question ${questionId} found in Set ${setId} for this Lecturer`);
    }
    throw error;
  }
}

export async function deleteQuestion(
  lecturerId: string,
  setId: string,
  questionId: string
): Promise<void> {
  await findOwnedQuestion(lecturerId, setId, questionId);
  try {
    await prisma.question.delete({ where: { id: questionId } });
  } catch (error) {
    if (isRecordNotFound(error)) {
      throw new NotFoundError(`No Question ${questionId} found in Set ${setId} for this Lecturer`);
    }
    throw error;
  }
}

export async function reorderQuestions(
  lecturerId: string,
  setId: string,
  orderedQuestionIds: string[]
): Promise<QuestionView[]> {
  await findOwnedSet(lecturerId, setId);

  return runSerializable(async (tx) => {
    const existing = await tx.question.findMany({ where: { setId }, include: questionInclude });
    const existingById = new Map(existing.map((question) => [question.id, question]));

    if (
      existingById.size !== orderedQuestionIds.length ||
      orderedQuestionIds.some((id) => !existingById.has(id))
    ) {
      throw new InvalidInputError(
        "The reordered id list must contain exactly the Set's existing Questions"
      );
    }

    for (const [order, id] of orderedQuestionIds.entries()) {
      await tx.question.update({ where: { id }, data: { order } });
    }

    return orderedQuestionIds.map((id) => toQuestionView(existingById.get(id)!));
  });
}
