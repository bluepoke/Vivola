import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { InvalidInputError, NotFoundError, SessionEndedError } from "@/lib/errors";
import { signUp } from "@/lib/auth/lecturer-auth";
import { addQuestion, createSet } from "@/lib/sets/set-service";
import { endSession, openQuestion, startSession } from "@/lib/sessions/session-service";
import {
  JoiningClosedError,
  NicknameTakenError,
  getStudentCount,
  getStudentInSession,
  joinSessionByJoinCode,
} from "@/lib/students/student-service";

async function makeLecturer(email: string) {
  return signUp({ email, password: "correct-horse-battery-staple" });
}

async function makeSurveySession(lecturerId: string) {
  const set = await createSet(lecturerId, { type: "SURVEY", title: "Opinions" });
  return startSession(lecturerId, { setId: set.id, displayMode: "SPLIT" });
}

async function makeQuizSession(lecturerId: string) {
  const set = await createSet(lecturerId, { type: "QUESTION", title: "Week 3 quiz" });
  return startSession(lecturerId, { setId: set.id, displayMode: "SPLIT" });
}

async function makeQuizSessionWithQuestion(lecturerId: string) {
  const set = await createSet(lecturerId, { type: "QUESTION", title: "Week 3 quiz" });
  await addQuestion(lecturerId, set.id, {
    prompt: "What is 2 + 2?",
    options: [{ text: "3" }, { text: "4", isCorrect: true }],
  });
  return startSession(lecturerId, { setId: set.id, displayMode: "SPLIT" });
}

beforeEach(async () => {
  await prisma.lecturer.deleteMany();
});

describe("joinSessionByJoinCode", () => {
  it("joins a Survey Session anonymously, with no nickname required", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeSurveySession(lecturer.id);

    const student = await joinSessionByJoinCode(session.joinCode, {});

    expect(student.sessionId).toBe(session.id);
    expect(student.nickname).toBeNull();
  });

  it("ignores a nickname supplied for a Survey Session, joining anonymously anyway", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeSurveySession(lecturer.id);

    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });

    expect(student.nickname).toBeNull();
  });

  it("lets any number of Students join the same Survey Session anonymously", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeSurveySession(lecturer.id);

    const first = await joinSessionByJoinCode(session.joinCode, {});
    const second = await joinSessionByJoinCode(session.joinCode, {});

    expect(first.id).not.toBe(second.id);
  });

  it("joins a Quiz Session with a chosen nickname", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSession(lecturer.id);

    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });

    expect(student.sessionId).toBe(session.id);
    expect(student.nickname).toBe("Ada");
  });

  it("trims whitespace from a Quiz Session nickname", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSession(lecturer.id);

    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "  Ada  " });

    expect(student.nickname).toBe("Ada");
  });

  it("rejects joining a Quiz Session without a nickname", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSession(lecturer.id);

    await expect(joinSessionByJoinCode(session.joinCode, {})).rejects.toBeInstanceOf(
      InvalidInputError
    );
  });

  it("rejects joining a Quiz Session with a blank nickname", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSession(lecturer.id);

    await expect(
      joinSessionByJoinCode(session.joinCode, { nickname: "   " })
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("rejects a nickname already taken in that Quiz Session", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSession(lecturer.id);
    await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });

    await expect(
      joinSessionByJoinCode(session.joinCode, { nickname: "Ada" })
    ).rejects.toBeInstanceOf(NicknameTakenError);
  });

  it("scopes nickname uniqueness to a single Session, not globally", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const sessionA = await makeQuizSession(ada.id);
    const sessionB = await makeQuizSession(grace.id);
    await joinSessionByJoinCode(sessionA.joinCode, { nickname: "Ada" });

    const student = await joinSessionByJoinCode(sessionB.joinCode, { nickname: "Ada" });

    expect(student.nickname).toBe("Ada");
  });

  it("throws NotFoundError for an unknown join code", async () => {
    await expect(joinSessionByJoinCode("ZZZZZZ", {})).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects joining once the Lecturer has opened the first Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSessionWithQuestion(lecturer.id);
    await openQuestion(lecturer.id, session.id, session.questions[0]!.id);

    await expect(
      joinSessionByJoinCode(session.joinCode, { nickname: "Late Ada" })
    ).rejects.toBeInstanceOf(JoiningClosedError);
  });

  it("rejects joining a Session that has already ended, even before any Question ever opened", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeSurveySession(lecturer.id);
    await endSession(lecturer.id, session.id);

    await expect(joinSessionByJoinCode(session.joinCode, {})).rejects.toBeInstanceOf(
      SessionEndedError
    );
  });

  it("throws NotFoundError instead of crashing if the Session is cancelled between the join-code lookup and the Student being created", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeSurveySession(lecturer.id);

    const originalCreate = prisma.student.create.bind(prisma.student);
    const createSpy = vi.spyOn(prisma.student, "create").mockImplementationOnce(((
      ...args: Parameters<typeof prisma.student.create>
    ) => {
      return (async () => {
        await prisma.session.delete({ where: { id: session.id } });
        return originalCreate(...args);
      })();
    }) as unknown as typeof prisma.student.create);

    await expect(joinSessionByJoinCode(session.joinCode, {})).rejects.toBeInstanceOf(
      NotFoundError
    );

    createSpy.mockRestore();
  });
});

describe("getStudentInSession", () => {
  it("returns the Student when they belong to the given Session", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSession(lecturer.id);
    const student = await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });

    const found = await getStudentInSession(session.id, student.id);

    expect(found?.nickname).toBe("Ada");
  });

  it("returns null for a Student who belongs to a different Session", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const sessionA = await makeSurveySession(ada.id);
    const sessionB = await makeSurveySession(grace.id);
    const student = await joinSessionByJoinCode(sessionA.joinCode, {});

    const found = await getStudentInSession(sessionB.id, student.id);

    expect(found).toBeNull();
  });

  it("returns null for a Student id that doesn't exist", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeSurveySession(lecturer.id);

    const found = await getStudentInSession(session.id, "does-not-exist");

    expect(found).toBeNull();
  });
});

describe("getStudentCount", () => {
  it("returns 0 for a Session no Student has joined yet", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeSurveySession(lecturer.id);

    await expect(getStudentCount(session.id)).resolves.toBe(0);
  });

  it("counts the Students who have joined a Session", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const session = await makeQuizSession(lecturer.id);
    await joinSessionByJoinCode(session.joinCode, { nickname: "Ada" });
    await joinSessionByJoinCode(session.joinCode, { nickname: "Grace" });

    await expect(getStudentCount(session.id)).resolves.toBe(2);
  });

  it("doesn't count Students who joined a different Session", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const sessionA = await makeSurveySession(ada.id);
    const sessionB = await makeSurveySession(grace.id);
    await joinSessionByJoinCode(sessionA.joinCode, {});

    await expect(getStudentCount(sessionB.id)).resolves.toBe(0);
  });
});
