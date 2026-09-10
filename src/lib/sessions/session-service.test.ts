import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { NotFoundError } from "@/lib/errors";
import { signUp } from "@/lib/auth/lecturer-auth";
import { addQuestion, createSet, updateQuestion } from "@/lib/sets/set-service";
import {
  AlreadyActiveSessionError,
  getActiveSessionForLecturer,
  getPublicSession,
  getSession,
  getSessionByJoinCode,
  startSession,
} from "@/lib/sessions/session-service";

async function makeLecturer(email: string) {
  return signUp({ email, password: "correct-horse-battery-staple" });
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
});
