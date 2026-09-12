import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { signUp } from "@/lib/auth/lecturer-auth";
import { addQuestion, createSet } from "@/lib/sets/set-service";
import { closeQuestion, nextQuestion, openQuestion, startSession } from "@/lib/sessions/session-service";
import { joinSessionByJoinCode } from "@/lib/students/student-service";
import { submitAnswer } from "@/lib/answers/answer-service";
import { getLeaderboard } from "@/lib/leaderboard/leaderboard-service";

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
      { text: "5" },
    ],
  });
  return startSession(lecturerId, { setId: set.id, displayMode: "SPLIT" });
}

beforeEach(async () => {
  await prisma.lecturer.deleteMany();
});

describe("getLeaderboard", () => {
  it("ranks Students by their number of correct Answers, highest first", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const [firstQuestion, secondQuestion] = session.questions;
    const ada = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    const grace = await joinSessionByJoinCode(session.joinCode, { nickname: "Grace" });
    await openQuestion(lecturer.id, session.id, firstQuestion!.id);
    await submitAnswer(session.id, ada.id, { answerOptionIds: [firstQuestion!.options[1]!.id] }); // correct
    await submitAnswer(session.id, grace.id, { answerOptionIds: [firstQuestion!.options[0]!.id] }); // wrong
    await closeQuestion(lecturer.id, session.id);
    await nextQuestion(lecturer.id, session.id);
    await submitAnswer(session.id, ada.id, { answerOptionIds: [secondQuestion!.options[0]!.id] }); // correct
    await submitAnswer(session.id, grace.id, { answerOptionIds: [secondQuestion!.options[0]!.id] }); // correct
    await closeQuestion(lecturer.id, session.id);

    const leaderboard = await getLeaderboard(session.id);

    expect(leaderboard.map((entry) => [entry.nickname, entry.score])).toEqual([
      ["Ada", 2],
      ["Grace", 1],
    ]);
  });

  it("scores a Student who submitted no Answer as 0, but keeps them in the Leaderboard", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithTwoQuestions(lecturer.id);
    const firstQuestion = session.questions[0]!;
    const ada = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await joinSessionByJoinCode(session.joinCode, { nickname: "Grace" });
    await openQuestion(lecturer.id, session.id, firstQuestion.id);
    await submitAnswer(session.id, ada.id, { answerOptionIds: [firstQuestion.options[1]!.id] });
    await closeQuestion(lecturer.id, session.id);

    const leaderboard = await getLeaderboard(session.id);

    expect(leaderboard.map((entry) => [entry.nickname, entry.score])).toEqual([
      ["Ada", 1],
      ["Grace", 0],
    ]);
  });

  it("awards partial credit for a multi-select Answer, floored at zero", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithMultiSelectQuestion(lecturer.id);
    const question = session.questions[0]!;
    const ada = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    const grace = await joinSessionByJoinCode(session.joinCode, { nickname: "Grace" });
    const ida = await joinSessionByJoinCode(session.joinCode, { nickname: "Ida" });
    await openQuestion(lecturer.id, session.id, question.id);
    // Ada: both correct options, nothing else -> 2 - 0 = 2
    await submitAnswer(session.id, ada.id, {
      answerOptionIds: [question.options[0]!.id, question.options[2]!.id],
    });
    // Grace: one correct, one incorrect -> 1 - 1 = 0
    await submitAnswer(session.id, grace.id, {
      answerOptionIds: [question.options[0]!.id, question.options[1]!.id],
    });
    // Ida: both incorrect options -> 0 - 2, floored at 0
    await submitAnswer(session.id, ida.id, {
      answerOptionIds: [question.options[1]!.id, question.options[3]!.id],
    });
    await closeQuestion(lecturer.id, session.id);

    const leaderboard = await getLeaderboard(session.id);

    expect(new Map(leaderboard.map((entry) => [entry.nickname, entry.score]))).toEqual(
      new Map([
        ["Ada", 2],
        ["Grace", 0],
        ["Ida", 0],
      ])
    );
  });
});
