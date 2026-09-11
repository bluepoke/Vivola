import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { NotFoundError } from "@/lib/errors";
import { signUp } from "@/lib/auth/lecturer-auth";
import { addQuestion, createSet, updateQuestion } from "@/lib/sets/set-service";
import {
  AlreadyActiveSessionError,
  NoNextQuestionError,
  OutOfOrderQuestionError,
  QuestionAlreadyOpenError,
  QuestionNotClosedError,
  QuestionNotOpenError,
  SessionEndedError,
  cancelSession,
  closeQuestion,
  endSession,
  getActiveSessionForLecturer,
  getPublicSession,
  getSession,
  getSessionByJoinCode,
  nextQuestion,
  openQuestion,
  startSession,
} from "@/lib/sessions/session-service";
import { NoOpenQuestionError, submitAnswer } from "@/lib/answers/answer-service";
import { joinSessionByJoinCode } from "@/lib/students/student-service";

async function makeLecturer(email: string) {
  return signUp({ email, password: "correct-horse-battery-staple" });
}

async function makeQuizSessionWithQuestions(lecturerId: string) {
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

describe("startSession", () => {
  it("starts a Session that mirrors the Set's type, title, and chosen Display mode", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "QUESTION", title: "Week 3 quiz" });

    const session = await startSession(lecturer.id, { setId: set.id, displayMode: "SPLIT" });

    expect(session.type).toBe("QUESTION");
    expect(session.title).toBe("Week 3 quiz");
    expect(session.displayMode).toBe("SPLIT");
    expect(session.joinCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("snapshots the Set's Questions and options at that moment", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "QUESTION", title: "Week 3 quiz" });
    await addQuestion(lecturer.id, set.id, {
      prompt: "What is 2 + 2?",
      options: [{ text: "3" }, { text: "4", isCorrect: true }],
    });

    const session = await startSession(lecturer.id, { setId: set.id, displayMode: "SPLIT" });

    expect(session.questions).toHaveLength(1);
    expect(session.questions[0]!.prompt).toBe("What is 2 + 2?");
    expect(session.questions[0]!.options.map((o) => [o.text, o.isCorrect])).toEqual([
      ["3", false],
      ["4", true],
    ]);
  });

  it("does not include Questions added to the Set after the Session has started", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });
    await addQuestion(lecturer.id, set.id, { prompt: "Before?", options: [{ text: "A" }, { text: "B" }] });

    const session = await startSession(lecturer.id, { setId: set.id, displayMode: "SPLIT" });
    await addQuestion(lecturer.id, set.id, { prompt: "After?", options: [{ text: "A" }, { text: "B" }] });

    const reloaded = await getSession(lecturer.id, session.id);
    expect(reloaded.questions.map((q) => q.prompt)).toEqual(["Before?"]);
  });

  it("is unaffected by edits to a Question already snapshotted into the Session", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "QUESTION", title: "Week 3 quiz" });
    const question = await addQuestion(lecturer.id, set.id, {
      prompt: "What is 2 + 2?",
      options: [{ text: "3" }, { text: "4", isCorrect: true }],
    });

    const session = await startSession(lecturer.id, { setId: set.id, displayMode: "SPLIT" });

    await updateQuestion(lecturer.id, set.id, question.id, {
      prompt: "Edited after start",
      options: [{ text: "X", isCorrect: true }, { text: "Y" }],
    });

    const reloaded = await getSession(lecturer.id, session.id);
    expect(reloaded.questions[0]!.prompt).toBe("What is 2 + 2?");
    expect(reloaded.questions[0]!.options.map((o) => o.text)).toEqual(["3", "4"]);
  });

  it("throws NotFoundError for a Set owned by a different Lecturer", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const gracesSet = await createSet(grace.id, { type: "SURVEY", title: "Grace's set" });

    await expect(
      startSession(ada.id, { setId: gracesSet.id, displayMode: "SPLIT" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects starting a second Session while the Lecturer already has one active", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const setA = await createSet(lecturer.id, { type: "SURVEY", title: "Set A" });
    const setB = await createSet(lecturer.id, { type: "SURVEY", title: "Set B" });
    await startSession(lecturer.id, { setId: setA.id, displayMode: "SPLIT" });

    await expect(
      startSession(lecturer.id, { setId: setB.id, displayMode: "SPLIT" })
    ).rejects.toBeInstanceOf(AlreadyActiveSessionError);
  });

  it("lets a different Lecturer start their own Session even while another Lecturer has one active", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const adasSet = await createSet(ada.id, { type: "SURVEY", title: "Ada's set" });
    const gracesSet = await createSet(grace.id, { type: "SURVEY", title: "Grace's set" });
    await startSession(ada.id, { setId: adasSet.id, displayMode: "SPLIT" });

    await expect(
      startSession(grace.id, { setId: gracesSet.id, displayMode: "COMBINED" })
    ).resolves.toBeTruthy();
  });

  it("assigns different join codes to different Sessions", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const adasSet = await createSet(ada.id, { type: "SURVEY", title: "Ada's set" });
    const gracesSet = await createSet(grace.id, { type: "SURVEY", title: "Grace's set" });

    const adasSession = await startSession(ada.id, { setId: adasSet.id, displayMode: "SPLIT" });
    const gracesSession = await startSession(grace.id, { setId: gracesSet.id, displayMode: "SPLIT" });

    expect(adasSession.joinCode).not.toBe(gracesSession.joinCode);
  });
});

describe("getSession", () => {
  it("throws NotFoundError for a Session owned by a different Lecturer", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const gracesSet = await createSet(grace.id, { type: "SURVEY", title: "Grace's set" });
    const gracesSession = await startSession(grace.id, { setId: gracesSet.id, displayMode: "SPLIT" });

    await expect(getSession(ada.id, gracesSession.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for a Session that doesn't exist", async () => {
    const lecturer = await makeLecturer("ada@example.com");

    await expect(getSession(lecturer.id, "does-not-exist")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("cancelSession", () => {
  it("deletes the Session, freeing the Lecturer to start another one", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const setA = await createSet(lecturer.id, { type: "SURVEY", title: "Set A" });
    const setB = await createSet(lecturer.id, { type: "SURVEY", title: "Set B" });
    const session = await startSession(lecturer.id, { setId: setA.id, displayMode: "SPLIT" });

    await cancelSession(lecturer.id, session.id);

    await expect(getSession(lecturer.id, session.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      startSession(lecturer.id, { setId: setB.id, displayMode: "SPLIT" })
    ).resolves.toBeTruthy();
  });

  it("throws NotFoundError for a Session owned by a different Lecturer", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const gracesSet = await createSet(grace.id, { type: "SURVEY", title: "Grace's set" });
    const gracesSession = await startSession(grace.id, { setId: gracesSet.id, displayMode: "SPLIT" });

    await expect(cancelSession(ada.id, gracesSession.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for a Session that was already cancelled", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });
    const session = await startSession(lecturer.id, { setId: set.id, displayMode: "SPLIT" });

    await cancelSession(lecturer.id, session.id);

    await expect(cancelSession(lecturer.id, session.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws SessionEndedError for a Session that has already ended, preserving its recorded results", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });
    const session = await startSession(lecturer.id, { setId: set.id, displayMode: "SPLIT" });
    await endSession(lecturer.id, session.id);

    await expect(cancelSession(lecturer.id, session.id)).rejects.toBeInstanceOf(SessionEndedError);
    await expect(getSession(lecturer.id, session.id)).resolves.toBeTruthy();
  });
});

describe("getSessionByJoinCode", () => {
  it("returns the public Session view for a valid join code, with no auth required", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });
    const session = await startSession(lecturer.id, { setId: set.id, displayMode: "SPLIT" });

    const found = await getSessionByJoinCode(session.joinCode);

    expect(found.id).toBe(session.id);
    expect(found.title).toBe("Opinions");
  });

  it("throws NotFoundError for an unknown join code", async () => {
    await expect(getSessionByJoinCode("ZZZZZZ")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("getActiveSessionForLecturer", () => {
  it("returns null when the Lecturer has no active Session", async () => {
    const lecturer = await makeLecturer("ada@example.com");

    await expect(getActiveSessionForLecturer(lecturer.id)).resolves.toBeNull();
  });

  it("returns the Lecturer's active Session once one has started", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });
    const session = await startSession(lecturer.id, { setId: set.id, displayMode: "SPLIT" });

    const active = await getActiveSessionForLecturer(lecturer.id);

    expect(active?.id).toBe(session.id);
    expect(active?.title).toBe("Opinions");
  });
});

describe("getPublicSession", () => {
  it("returns the public Session view by id, with no auth or ownership required", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });
    const session = await startSession(lecturer.id, { setId: set.id, displayMode: "COMBINED" });

    const found = await getPublicSession(session.id);

    expect(found.title).toBe("Opinions");
    expect(found.joinCode).toBe(session.joinCode);
  });

  it("throws NotFoundError for a Session that doesn't exist", async () => {
    await expect(getPublicSession("does-not-exist")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("starts with joining open and no open Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });
    const session = await startSession(lecturer.id, { setId: set.id, displayMode: "SPLIT" });

    const found = await getPublicSession(session.id);

    expect(found.joiningClosed).toBe(false);
    expect(found.openQuestion).toBeNull();
  });
});

describe("openQuestion", () => {
  it("opens the Session's first Question, returning its prompt and options", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    const firstQuestion = session.questions[0]!;

    const opened = await openQuestion(lecturer.id, session.id, firstQuestion.id);

    expect(opened.id).toBe(firstQuestion.id);
    expect(opened.prompt).toBe("What is 2 + 2?");
    expect(opened.options.map((o) => [o.text, o.isCorrect])).toEqual([
      ["3", false],
      ["4", true],
    ]);
  });

  it("closes joining once the first Question opens, publicly and on the join-code lookup", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    const firstQuestion = session.questions[0]!;

    await openQuestion(lecturer.id, session.id, firstQuestion.id);

    const publicSession = await getPublicSession(session.id);
    expect(publicSession.joiningClosed).toBe(true);
    expect(publicSession.openQuestion?.id).toBe(firstQuestion.id);
    expect(publicSession.openQuestion?.options).toEqual([
      { id: firstQuestion.options[0]!.id, text: "3" },
      { id: firstQuestion.options[1]!.id, text: "4" },
    ]);

    const byJoinCode = await getSessionByJoinCode(session.joinCode);
    expect(byJoinCode.joiningClosed).toBe(true);
  });

  it("reflects the open Question on the Lecturer's own Session view too", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    const firstQuestion = session.questions[0]!;

    await openQuestion(lecturer.id, session.id, firstQuestion.id);

    const reloaded = await getSession(lecturer.id, session.id);
    expect(reloaded.openQuestion?.id).toBe(firstQuestion.id);
  });

  it("rejects opening a Question that isn't the Session's first Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    const secondQuestion = session.questions[1]!;

    await expect(
      openQuestion(lecturer.id, session.id, secondQuestion.id)
    ).rejects.toBeInstanceOf(OutOfOrderQuestionError);
  });

  it("rejects opening a Question while one is already open", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    const firstQuestion = session.questions[0]!;
    await openQuestion(lecturer.id, session.id, firstQuestion.id);

    await expect(
      openQuestion(lecturer.id, session.id, firstQuestion.id)
    ).rejects.toBeInstanceOf(QuestionAlreadyOpenError);
  });

  it("throws NotFoundError for a Question that doesn't belong to the Session", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);

    await expect(
      openQuestion(lecturer.id, session.id, "does-not-exist")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for a Session owned by a different Lecturer", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const gracesSession = await makeQuizSessionWithQuestions(grace.id);
    const firstQuestion = gracesSession.questions[0]!;

    await expect(
      openQuestion(ada.id, gracesSession.id, firstQuestion.id)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects re-opening the first Question once it has been closed", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    const firstQuestion = session.questions[0]!;
    await openQuestion(lecturer.id, session.id, firstQuestion.id);
    await closeQuestion(lecturer.id, session.id);

    await expect(
      openQuestion(lecturer.id, session.id, firstQuestion.id)
    ).rejects.toBeInstanceOf(OutOfOrderQuestionError);
  });
});

describe("closeQuestion", () => {
  it("closes the currently open Question and returns it, correct answers revealed", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    const firstQuestion = session.questions[0]!;
    await openQuestion(lecturer.id, session.id, firstQuestion.id);

    const closed = await closeQuestion(lecturer.id, session.id);

    expect(closed.id).toBe(firstQuestion.id);
    expect(closed.options.map((o) => [o.text, o.isCorrect])).toEqual([
      ["3", false],
      ["4", true],
    ]);
  });

  it("stops accepting further Answers for the closed Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    const firstQuestion = session.questions[0]!;
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await openQuestion(lecturer.id, session.id, firstQuestion.id);
    await closeQuestion(lecturer.id, session.id);

    await expect(
      submitAnswer(session.id, student.id, { answerOptionId: firstQuestion.options[0]!.id })
    ).rejects.toBeInstanceOf(NoOpenQuestionError);
  });

  it("clears the Session's open Question and reflects the closed Question instead", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    const firstQuestion = session.questions[0]!;
    await openQuestion(lecturer.id, session.id, firstQuestion.id);

    await closeQuestion(lecturer.id, session.id);

    const reloaded = await getSession(lecturer.id, session.id);
    expect(reloaded.openQuestion).toBeNull();
    expect(reloaded.closedQuestion?.id).toBe(firstQuestion.id);

    const publicView = await getPublicSession(session.id);
    expect(publicView.openQuestion).toBeNull();
    expect(publicView.closedQuestion?.id).toBe(firstQuestion.id);
    expect(publicView.closedQuestion?.options.map((o) => [o.text, o.isCorrect])).toEqual([
      ["3", false],
      ["4", true],
    ]);
  });

  it("throws QuestionNotOpenError when no Question is currently open", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);

    await expect(closeQuestion(lecturer.id, session.id)).rejects.toBeInstanceOf(QuestionNotOpenError);
  });

  it("throws QuestionNotOpenError when the open Question has already been closed", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    await openQuestion(lecturer.id, session.id, session.questions[0]!.id);
    await closeQuestion(lecturer.id, session.id);

    await expect(closeQuestion(lecturer.id, session.id)).rejects.toBeInstanceOf(QuestionNotOpenError);
  });

  it("throws NotFoundError for a Session owned by a different Lecturer", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const gracesSession = await makeQuizSessionWithQuestions(grace.id);
    await openQuestion(grace.id, gracesSession.id, gracesSession.questions[0]!.id);

    await expect(closeQuestion(ada.id, gracesSession.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("nextQuestion", () => {
  it("opens the next Question in fixed order after the closed one", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    const [firstQuestion, secondQuestion] = session.questions;
    await openQuestion(lecturer.id, session.id, firstQuestion!.id);
    await closeQuestion(lecturer.id, session.id);

    const opened = await nextQuestion(lecturer.id, session.id);

    expect(opened.id).toBe(secondQuestion!.id);
    expect(opened.prompt).toBe("What is 3 + 3?");

    const reloaded = await getSession(lecturer.id, session.id);
    expect(reloaded.openQuestion?.id).toBe(secondQuestion!.id);
    expect(reloaded.closedQuestion).toBeNull();
  });

  it("repeats the open/answer/close/Analysis cycle for the newly opened Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    const [firstQuestion, secondQuestion] = session.questions;
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await openQuestion(lecturer.id, session.id, firstQuestion!.id);
    await closeQuestion(lecturer.id, session.id);
    await nextQuestion(lecturer.id, session.id);

    await submitAnswer(session.id, student.id, { answerOptionId: secondQuestion!.options[0]!.id });
    const closed = await closeQuestion(lecturer.id, session.id);

    expect(closed.id).toBe(secondQuestion!.id);
  });

  it("throws QuestionNotClosedError when a Question is still open", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    await openQuestion(lecturer.id, session.id, session.questions[0]!.id);

    await expect(nextQuestion(lecturer.id, session.id)).rejects.toBeInstanceOf(QuestionNotClosedError);
  });

  it("throws QuestionNotClosedError before any Question has ever been opened", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);

    await expect(nextQuestion(lecturer.id, session.id)).rejects.toBeInstanceOf(QuestionNotClosedError);
  });

  it("throws NoNextQuestionError once the Session's last Question has closed", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    await openQuestion(lecturer.id, session.id, session.questions[0]!.id);
    await closeQuestion(lecturer.id, session.id);
    await nextQuestion(lecturer.id, session.id);
    await closeQuestion(lecturer.id, session.id);

    await expect(nextQuestion(lecturer.id, session.id)).rejects.toBeInstanceOf(NoNextQuestionError);
  });

  it("throws NotFoundError for a Session owned by a different Lecturer", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const gracesSession = await makeQuizSessionWithQuestions(grace.id);
    await openQuestion(grace.id, gracesSession.id, gracesSession.questions[0]!.id);
    await closeQuestion(grace.id, gracesSession.id);

    await expect(nextQuestion(ada.id, gracesSession.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("endSession", () => {
  it("marks the Session as ended, at any point, even before any Question has opened", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);

    await endSession(lecturer.id, session.id);

    const reloaded = await getSession(lecturer.id, session.id);
    expect(reloaded.ended).toBe(true);
  });

  it("marks the Session as ended while a Question is still open", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    await openQuestion(lecturer.id, session.id, session.questions[0]!.id);

    await endSession(lecturer.id, session.id);

    const reloaded = await getSession(lecturer.id, session.id);
    expect(reloaded.ended).toBe(true);
  });

  it("frees the Lecturer to start a new Session", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const setA = await createSet(lecturer.id, { type: "SURVEY", title: "Set A" });
    const setB = await createSet(lecturer.id, { type: "SURVEY", title: "Set B" });
    const session = await startSession(lecturer.id, { setId: setA.id, displayMode: "SPLIT" });

    await endSession(lecturer.id, session.id);

    await expect(getActiveSessionForLecturer(lecturer.id)).resolves.toBeNull();
    await expect(
      startSession(lecturer.id, { setId: setB.id, displayMode: "SPLIT" })
    ).resolves.toBeTruthy();
  });

  it("does not delete the Session, so it stays available for Lecturer review", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);

    await endSession(lecturer.id, session.id);

    await expect(getSession(lecturer.id, session.id)).resolves.toBeTruthy();
  });

  it("throws SessionEndedError when the Session has already ended", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    await endSession(lecturer.id, session.id);

    await expect(endSession(lecturer.id, session.id)).rejects.toBeInstanceOf(SessionEndedError);
  });

  it("throws NotFoundError for a Session owned by a different Lecturer", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const gracesSession = await makeQuizSessionWithQuestions(grace.id);

    await expect(endSession(ada.id, gracesSession.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for a Session that doesn't exist", async () => {
    const lecturer = await makeLecturer("ada@example.com");

    await expect(endSession(lecturer.id, "does-not-exist")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects opening a Question once the Session has ended", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    await endSession(lecturer.id, session.id);

    await expect(
      openQuestion(lecturer.id, session.id, session.questions[0]!.id)
    ).rejects.toBeInstanceOf(SessionEndedError);
  });

  it("rejects closing the open Question once the Session has ended", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    await openQuestion(lecturer.id, session.id, session.questions[0]!.id);
    await endSession(lecturer.id, session.id);

    await expect(closeQuestion(lecturer.id, session.id)).rejects.toBeInstanceOf(SessionEndedError);
  });

  it("rejects advancing to the next Question once the Session has ended", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestions(lecturer.id);
    await openQuestion(lecturer.id, session.id, session.questions[0]!.id);
    await closeQuestion(lecturer.id, session.id);
    await endSession(lecturer.id, session.id);

    await expect(nextQuestion(lecturer.id, session.id)).rejects.toBeInstanceOf(SessionEndedError);
  });
});
