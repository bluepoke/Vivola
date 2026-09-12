import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { NotFoundError } from "@/lib/errors";
import { signUp } from "@/lib/auth/lecturer-auth";
import { addQuestion, createSet } from "@/lib/sets/set-service";
import { SessionEndedError } from "@/lib/errors";
import { closeQuestion, endSession, openQuestion, startSession } from "@/lib/sessions/session-service";
import { joinSessionByJoinCode } from "@/lib/students/student-service";
import {
  AlreadyAnsweredError,
  InvalidAnswerOptionError,
  NoOpenQuestionError,
  getAnswerCount,
  getAnswerForStudent,
  getQuestionAnalysis,
  submitAnswer,
} from "@/lib/answers/answer-service";

async function makeLecturer(email: string) {
  return signUp({ email, password: "correct-horse-battery-staple" });
}

async function makeQuizSessionWithTwoQuestions(lecturerId: string) {
  const set = await createSet(lecturerId, { type: "QUESTION", title: "Week 3 quiz" });
  await addQuestion(lecturerId, set.id, {
    prompt: "What is 2 + 2?",
    options: [{ text: "3" }, { text: "4", isCorrect: true }],
  });
  await addQuestion(lecturerId, set.id, {
    prompt: "What is 3 + 3?",
    options: [{ text: "6", isCorrect: true }, { text: "7" }],
  });
  return startSession(lecturerId, { setId: set.id, displayMode: "SPLIT" });
}

async function makeQuizSessionWithMultiSelectQuestion(lecturerId: string) {
  const set = await createSet(lecturerId, { type: "QUESTION", title: "Week 3 quiz" });
  await addQuestion(lecturerId, set.id, {
    prompt: "Which are even?",
    type: "MULTI_SELECT",
    options: [
      { text: "2", isCorrect: true },
      { text: "3" },
      { text: "4", isCorrect: true },
    ],
  });
  return startSession(lecturerId, { setId: set.id, displayMode: "SPLIT" });
}

beforeEach(async () => {
  await prisma.lecturer.deleteMany();
});

describe("submitAnswer", () => {
  it("records a Student's Answer to the currently open Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const question = session.questions[0]!;
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await openQuestion(lecturer.id, session.id, question.id);

    const answer = await submitAnswer(session.id, student.id, { answerOptionIds: [question.options[1]!.id,] });

    expect(answer.sessionQuestionId).toBe(question.id);
    expect(answer.studentId).toBe(student.id);
    expect(answer.answerOptionIds).toEqual([question.options[1]!.id]);
  });

  it("rejects a second Answer from the same Student to the same Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const question = session.questions[0]!;
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await openQuestion(lecturer.id, session.id, question.id);
    await submitAnswer(session.id, student.id, { answerOptionIds: [question.options[0]!.id] });

    await expect(
      submitAnswer(session.id, student.id, { answerOptionIds: [question.options[1]!.id] })
    ).rejects.toBeInstanceOf(AlreadyAnsweredError);
  });

  it("rejects an Answer when no Question is currently open", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });

    await expect(
      submitAnswer(session.id, student.id, { answerOptionIds: [session.questions[0]!.options[0]!.id] })
    ).rejects.toBeInstanceOf(NoOpenQuestionError);
  });

  it("rejects an answer option that doesn't belong to the currently open Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const [firstQuestion, secondQuestion] = session.questions;
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await openQuestion(lecturer.id, session.id, firstQuestion!.id);

    await expect(
      submitAnswer(session.id, student.id, { answerOptionIds: [secondQuestion!.options[0]!.id] })
    ).rejects.toBeInstanceOf(InvalidAnswerOptionError);
  });

  it("throws NotFoundError for a Student who doesn't belong to this Session", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const otherSession = await makeQuizSessionWithTwoQuestions(grace.id);
    await openQuestion(lecturer.id, session.id, session.questions[0]!.id);
    const studentOfOtherSession = await joinSessionByJoinCode(otherSession.joinCode, { nickname: "Grace" });

    await expect(
      submitAnswer(session.id, studentOfOtherSession.id, { answerOptionIds: [session.questions[0]!.options[0]!.id,] })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects an Answer once the Session has ended, even to a Question left open", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const question = session.questions[0]!;
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await openQuestion(lecturer.id, session.id, question.id);
    await endSession(lecturer.id, session.id);

    await expect(
      submitAnswer(session.id, student.id, { answerOptionIds: [question.options[0]!.id] })
    ).rejects.toBeInstanceOf(SessionEndedError);
  });

  it("lets different Students each submit their own Answer to the same Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const question = session.questions[0]!;
    const ada = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    const grace = await joinSessionByJoinCode(session.joinCode, { nickname: "Grace" });
    await openQuestion(lecturer.id, session.id, question.id);

    await submitAnswer(session.id, ada.id, { answerOptionIds: [question.options[0]!.id] });
    await submitAnswer(session.id, grace.id, { answerOptionIds: [question.options[1]!.id] });

    await expect(getAnswerForStudent(question.id, ada.id)).resolves.toMatchObject({ answerOptionIds: [question.options[0]!.id,] });
    await expect(getAnswerForStudent(question.id, grace.id)).resolves.toMatchObject({ answerOptionIds: [question.options[1]!.id,] });
  });

  it("records a Student's multiple selected options for a multi-select Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithMultiSelectQuestion(lecturer.id);
    const question = session.questions[0]!;
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await openQuestion(lecturer.id, session.id, question.id);

    const answer = await submitAnswer(session.id, student.id, {
      answerOptionIds: [question.options[0]!.id, question.options[2]!.id],
    });

    expect(new Set(answer.answerOptionIds)).toEqual(
      new Set([question.options[0]!.id, question.options[2]!.id])
    );
  });

  it("rejects more than one selected option for a single-select Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const question = session.questions[0]!;
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await openQuestion(lecturer.id, session.id, question.id);

    await expect(
      submitAnswer(session.id, student.id, {
        answerOptionIds: [question.options[0]!.id, question.options[1]!.id],
      })
    ).rejects.toBeInstanceOf(InvalidAnswerOptionError);
  });

  it("rejects an empty selection", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const question = session.questions[0]!;
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await openQuestion(lecturer.id, session.id, question.id);

    await expect(
      submitAnswer(session.id, student.id, { answerOptionIds: [] })
    ).rejects.toBeInstanceOf(InvalidAnswerOptionError);
  });
});

describe("getAnswerForStudent", () => {
  it("returns null when the Student hasn't answered this Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const question = session.questions[0]!;
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await openQuestion(lecturer.id, session.id, question.id);

    await expect(getAnswerForStudent(question.id, student.id)).resolves.toBeNull();
  });
});

describe("getAnswerCount", () => {
  it("counts only the Answers submitted for the given Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const [firstQuestion, secondQuestion] = session.questions;
    const ada = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    const grace = await joinSessionByJoinCode(session.joinCode, { nickname: "Grace" });
    await openQuestion(lecturer.id, session.id, firstQuestion!.id);
    await submitAnswer(session.id, ada.id, { answerOptionIds: [firstQuestion!.options[0]!.id] });

    await expect(getAnswerCount(firstQuestion!.id)).resolves.toBe(1);
    await expect(getAnswerCount(secondQuestion!.id)).resolves.toBe(0);

    await submitAnswer(session.id, grace.id, { answerOptionIds: [firstQuestion!.options[1]!.id] });

    await expect(getAnswerCount(firstQuestion!.id)).resolves.toBe(2);
  });
});

describe("getQuestionAnalysis", () => {
  it("counts Answers per option, revealing which option is correct", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const question = session.questions[0]!;
    const ada = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    const grace = await joinSessionByJoinCode(session.joinCode, { nickname: "Grace" });
    const ida = await joinSessionByJoinCode(session.joinCode, { nickname: "Ida" });
    await openQuestion(lecturer.id, session.id, question.id);
    await submitAnswer(session.id, ada.id, { answerOptionIds: [question.options[0]!.id] });
    await submitAnswer(session.id, grace.id, { answerOptionIds: [question.options[1]!.id] });
    await submitAnswer(session.id, ida.id, { answerOptionIds: [question.options[1]!.id] });
    const closed = await closeQuestion(lecturer.id, session.id);

    const analysis = await getQuestionAnalysis(closed);

    expect(analysis.totalAnswered).toBe(3);
    expect(analysis.options.map((o) => [o.text, o.count, o.isCorrect])).toEqual([
      ["3", 1, false],
      ["4", 2, true],
    ]);
  });

  it("excludes Students who submitted no Answer from the distribution and total", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const question = session.questions[0]!;
    const ada = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await joinSessionByJoinCode(session.joinCode, { nickname: "Grace" });
    await openQuestion(lecturer.id, session.id, question.id);
    await submitAnswer(session.id, ada.id, { answerOptionIds: [question.options[0]!.id] });
    const closed = await closeQuestion(lecturer.id, session.id);

    const analysis = await getQuestionAnalysis(closed);

    expect(analysis.totalAnswered).toBe(1);
    expect(analysis.options.map((o) => o.count)).toEqual([1, 0]);
  });

  it("counts a multi-select Student's Answer toward each option they selected", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithMultiSelectQuestion(lecturer.id);
    const question = session.questions[0]!;
    const ada = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    const grace = await joinSessionByJoinCode(session.joinCode, { nickname: "Grace" });
    await openQuestion(lecturer.id, session.id, question.id);
    await submitAnswer(session.id, ada.id, {
      answerOptionIds: [question.options[0]!.id, question.options[2]!.id],
    });
    await submitAnswer(session.id, grace.id, { answerOptionIds: [question.options[0]!.id] });
    const closed = await closeQuestion(lecturer.id, session.id);

    const analysis = await getQuestionAnalysis(closed);

    expect(analysis.totalAnswered).toBe(2);
    expect(analysis.options.map((o) => [o.text, o.count])).toEqual([
      ["2", 2],
      ["3", 0],
      ["4", 1],
    ]);
  });
});
