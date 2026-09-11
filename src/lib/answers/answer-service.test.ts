import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { NotFoundError } from "@/lib/errors";
import { signUp } from "@/lib/auth/lecturer-auth";
import { addQuestion, createSet } from "@/lib/sets/set-service";
import { openQuestion, startSession } from "@/lib/sessions/session-service";
import { joinSessionByJoinCode } from "@/lib/students/student-service";
import {
  AlreadyAnsweredError,
  InvalidAnswerOptionError,
  NoOpenQuestionError,
  getAnswerForStudent,
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

    const answer = await submitAnswer(session.id, student.id, {
      answerOptionId: question.options[1]!.id,
    });

    expect(answer.sessionQuestionId).toBe(question.id);
    expect(answer.studentId).toBe(student.id);
    expect(answer.answerOptionId).toBe(question.options[1]!.id);
  });

  it("rejects a second Answer from the same Student to the same Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const question = session.questions[0]!;
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await openQuestion(lecturer.id, session.id, question.id);
    await submitAnswer(session.id, student.id, { answerOptionId: question.options[0]!.id });

    await expect(
      submitAnswer(session.id, student.id, { answerOptionId: question.options[1]!.id })
    ).rejects.toBeInstanceOf(AlreadyAnsweredError);
  });

  it("rejects an Answer when no Question is currently open", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });

    await expect(
      submitAnswer(session.id, student.id, { answerOptionId: session.questions[0]!.options[0]!.id })
    ).rejects.toBeInstanceOf(NoOpenQuestionError);
  });

  it("rejects an answer option that doesn't belong to the currently open Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const [firstQuestion, secondQuestion] = session.questions;
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await openQuestion(lecturer.id, session.id, firstQuestion!.id);

    await expect(
      submitAnswer(session.id, student.id, { answerOptionId: secondQuestion!.options[0]!.id })
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
      submitAnswer(session.id, studentOfOtherSession.id, {
        answerOptionId: session.questions[0]!.options[0]!.id,
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lets different Students each submit their own Answer to the same Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const question = session.questions[0]!;
    const ada = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    const grace = await joinSessionByJoinCode(session.joinCode, { nickname: "Grace" });
    await openQuestion(lecturer.id, session.id, question.id);

    await submitAnswer(session.id, ada.id, { answerOptionId: question.options[0]!.id });
    await submitAnswer(session.id, grace.id, { answerOptionId: question.options[1]!.id });

    await expect(getAnswerForStudent(question.id, ada.id)).resolves.toMatchObject({
      answerOptionId: question.options[0]!.id,
    });
    await expect(getAnswerForStudent(question.id, grace.id)).resolves.toMatchObject({
      answerOptionId: question.options[1]!.id,
    });
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
