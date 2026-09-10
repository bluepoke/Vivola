import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { signUp } from "@/lib/auth/lecturer-auth";
import {
  InvalidInputError,
  NotFoundError,
  addQuestion,
  createSet,
  deleteQuestion,
  deleteSet,
  getSet,
  listSets,
  reorderQuestions,
  updateQuestion,
} from "@/lib/sets/set-service";

async function makeLecturer(email: string) {
  return signUp({ email, password: "correct-horse-battery-staple" });
}

beforeEach(async () => {
  await prisma.lecturer.deleteMany();
});

describe("createSet", () => {
  it("creates a Survey Set owned by the Lecturer", async () => {
    const lecturer = await makeLecturer("ada@example.com");

    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Mid-lecture check-in" });

    expect(set.type).toBe("SURVEY");
    expect(set.title).toBe("Mid-lecture check-in");
    expect(set.questionCount).toBe(0);
  });

  it("creates a Question Set owned by the Lecturer", async () => {
    const lecturer = await makeLecturer("ada@example.com");

    const set = await createSet(lecturer.id, { type: "QUESTION", title: "Week 3 quiz" });

    expect(set.type).toBe("QUESTION");
  });

  it("rejects an empty title", async () => {
    const lecturer = await makeLecturer("ada@example.com");

    await expect(createSet(lecturer.id, { type: "SURVEY", title: "  " })).rejects.toBeInstanceOf(
      InvalidInputError
    );
  });
});

describe("listSets", () => {
  it("returns only the calling Lecturer's own Sets", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    await createSet(ada.id, { type: "SURVEY", title: "Ada's set" });
    await createSet(grace.id, { type: "SURVEY", title: "Grace's set" });

    const adaSets = await listSets(ada.id);

    expect(adaSets).toHaveLength(1);
    expect(adaSets[0]!.title).toBe("Ada's set");
  });
});

describe("getSet", () => {
  it("returns the Set with its Questions and options", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "QUESTION", title: "Week 3 quiz" });
    await addQuestion(lecturer.id, set.id, {
      prompt: "What is 2 + 2?",
      options: [
        { text: "3" },
        { text: "4", isCorrect: true },
      ],
    });

    const found = await getSet(lecturer.id, set.id);

    expect(found.questions).toHaveLength(1);
    expect(found.questions[0]!.prompt).toBe("What is 2 + 2?");
    expect(found.questions[0]!.options.map((o) => o.text)).toEqual(["3", "4"]);
  });

  it("throws NotFoundError for a Set that doesn't exist", async () => {
    const lecturer = await makeLecturer("ada@example.com");

    await expect(getSet(lecturer.id, "does-not-exist")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for a Set owned by a different Lecturer", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const gracesSet = await createSet(grace.id, { type: "SURVEY", title: "Grace's set" });

    await expect(getSet(ada.id, gracesSet.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("addQuestion", () => {
  it("adds a Survey Set question with no correct answer marked", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });

    const question = await addQuestion(lecturer.id, set.id, {
      prompt: "How confident do you feel?",
      options: [{ text: "Very" }, { text: "Not at all" }],
    });

    expect(question.options.every((o) => !o.isCorrect)).toBe(true);
  });

  it("rejects a Survey Set question with a correct answer marked", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });

    await expect(
      addQuestion(lecturer.id, set.id, {
        prompt: "How confident do you feel?",
        options: [{ text: "Very", isCorrect: true }, { text: "Not at all" }],
      })
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("adds a Question Set question with exactly one correct answer marked", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "QUESTION", title: "Week 3 quiz" });

    const question = await addQuestion(lecturer.id, set.id, {
      prompt: "What is 2 + 2?",
      options: [{ text: "3" }, { text: "4", isCorrect: true }],
    });

    expect(question.options.filter((o) => o.isCorrect)).toHaveLength(1);
  });

  it("rejects a Question Set question with no correct answer marked", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "QUESTION", title: "Week 3 quiz" });

    await expect(
      addQuestion(lecturer.id, set.id, {
        prompt: "What is 2 + 2?",
        options: [{ text: "3" }, { text: "4" }],
      })
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("rejects a Question Set question with more than one correct answer marked", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "QUESTION", title: "Week 3 quiz" });

    await expect(
      addQuestion(lecturer.id, set.id, {
        prompt: "What is 2 + 2?",
        options: [{ text: "3", isCorrect: true }, { text: "4", isCorrect: true }],
      })
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("rejects a question with fewer than two options", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });

    await expect(
      addQuestion(lecturer.id, set.id, { prompt: "Only one option?", options: [{ text: "Yes" }] })
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("throws NotFoundError when adding to a Set owned by a different Lecturer", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const gracesSet = await createSet(grace.id, { type: "SURVEY", title: "Grace's set" });

    await expect(
      addQuestion(ada.id, gracesSet.id, { prompt: "Hijack?", options: [{ text: "A" }, { text: "B" }] })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("appends new Questions in order", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });
    await addQuestion(lecturer.id, set.id, { prompt: "First?", options: [{ text: "A" }, { text: "B" }] });
    await addQuestion(lecturer.id, set.id, { prompt: "Second?", options: [{ text: "A" }, { text: "B" }] });

    const found = await getSet(lecturer.id, set.id);

    expect(found.questions.map((q) => q.prompt)).toEqual(["First?", "Second?"]);
  });

  it("handles two concurrent additions to the same Set without colliding on order", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });

    const [a, b] = await Promise.all([
      addQuestion(lecturer.id, set.id, { prompt: "A?", options: [{ text: "1" }, { text: "2" }] }),
      addQuestion(lecturer.id, set.id, { prompt: "B?", options: [{ text: "1" }, { text: "2" }] }),
    ]);

    const found = await getSet(lecturer.id, set.id);
    expect(found.questions).toHaveLength(2);
    expect(new Set(found.questions.map((q) => q.id))).toEqual(new Set([a.id, b.id]));
  });
});

describe("updateQuestion", () => {
  it("replaces the prompt and options of an existing Question", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "QUESTION", title: "Week 3 quiz" });
    const question = await addQuestion(lecturer.id, set.id, {
      prompt: "What is 2 + 2?",
      options: [{ text: "3" }, { text: "4", isCorrect: true }],
    });

    const updated = await updateQuestion(lecturer.id, set.id, question.id, {
      prompt: "What is 3 + 3?",
      options: [{ text: "5" }, { text: "6", isCorrect: true }],
    });

    expect(updated.prompt).toBe("What is 3 + 3?");
    expect(updated.options.map((o) => o.text)).toEqual(["5", "6"]);
  });

  it("re-validates the correct-answer rule against the Set's type", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "QUESTION", title: "Week 3 quiz" });
    const question = await addQuestion(lecturer.id, set.id, {
      prompt: "What is 2 + 2?",
      options: [{ text: "3" }, { text: "4", isCorrect: true }],
    });

    await expect(
      updateQuestion(lecturer.id, set.id, question.id, {
        prompt: "What is 2 + 2?",
        options: [{ text: "3" }, { text: "4" }],
      })
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("throws NotFoundError for a Question owned by a different Lecturer", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const gracesSet = await createSet(grace.id, { type: "SURVEY", title: "Grace's set" });
    const gracesQuestion = await addQuestion(grace.id, gracesSet.id, {
      prompt: "Original",
      options: [{ text: "A" }, { text: "B" }],
    });

    await expect(
      updateQuestion(ada.id, gracesSet.id, gracesQuestion.id, {
        prompt: "Hijacked",
        options: [{ text: "A" }, { text: "B" }],
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the Question doesn't belong to the given Set", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const setA = await createSet(lecturer.id, { type: "SURVEY", title: "Set A" });
    const setB = await createSet(lecturer.id, { type: "SURVEY", title: "Set B" });
    const question = await addQuestion(lecturer.id, setA.id, {
      prompt: "First?",
      options: [{ text: "A" }, { text: "B" }],
    });

    await expect(
      updateQuestion(lecturer.id, setB.id, question.id, {
        prompt: "Wrong set",
        options: [{ text: "A" }, { text: "B" }],
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("deleteQuestion", () => {
  it("removes the Question from its Set", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });
    const question = await addQuestion(lecturer.id, set.id, {
      prompt: "First?",
      options: [{ text: "A" }, { text: "B" }],
    });

    await deleteQuestion(lecturer.id, set.id, question.id);

    const found = await getSet(lecturer.id, set.id);
    expect(found.questions).toHaveLength(0);
  });

  it("raises NotFoundError, not a raw database error, when the Question was already deleted", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });
    const question = await addQuestion(lecturer.id, set.id, {
      prompt: "First?",
      options: [{ text: "A" }, { text: "B" }],
    });

    await deleteQuestion(lecturer.id, set.id, question.id);

    await expect(deleteQuestion(lecturer.id, set.id, question.id)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("throws NotFoundError for a Question owned by a different Lecturer", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const gracesSet = await createSet(grace.id, { type: "SURVEY", title: "Grace's set" });
    const gracesQuestion = await addQuestion(grace.id, gracesSet.id, {
      prompt: "Original",
      options: [{ text: "A" }, { text: "B" }],
    });

    await expect(
      deleteQuestion(ada.id, gracesSet.id, gracesQuestion.id)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("reorderQuestions", () => {
  it("applies a new order to the Set's Questions", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });
    const first = await addQuestion(lecturer.id, set.id, { prompt: "First?", options: [{ text: "A" }, { text: "B" }] });
    const second = await addQuestion(lecturer.id, set.id, { prompt: "Second?", options: [{ text: "A" }, { text: "B" }] });

    await reorderQuestions(lecturer.id, set.id, [second.id, first.id]);

    const found = await getSet(lecturer.id, set.id);
    expect(found.questions.map((q) => q.prompt)).toEqual(["Second?", "First?"]);
  });

  it("rejects an id list that doesn't exactly match the Set's Questions", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });
    const first = await addQuestion(lecturer.id, set.id, { prompt: "First?", options: [{ text: "A" }, { text: "B" }] });

    await expect(
      reorderQuestions(lecturer.id, set.id, [first.id, "not-a-real-id"])
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("throws NotFoundError for a Set owned by a different Lecturer", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const gracesSet = await createSet(grace.id, { type: "SURVEY", title: "Grace's set" });

    await expect(reorderQuestions(ada.id, gracesSet.id, [])).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("deleteSet", () => {
  it("removes the Set and its Questions", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });
    await addQuestion(lecturer.id, set.id, { prompt: "First?", options: [{ text: "A" }, { text: "B" }] });

    await deleteSet(lecturer.id, set.id);

    await expect(getSet(lecturer.id, set.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for a Set owned by a different Lecturer", async () => {
    const ada = await makeLecturer("ada@example.com");
    const grace = await makeLecturer("grace@example.com");
    const gracesSet = await createSet(grace.id, { type: "SURVEY", title: "Grace's set" });

    await expect(deleteSet(ada.id, gracesSet.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("raises NotFoundError, not a raw database error, when the Set was already deleted", async () => {
    const lecturer = await makeLecturer("ada@example.com");
    const set = await createSet(lecturer.id, { type: "SURVEY", title: "Opinions" });

    await deleteSet(lecturer.id, set.id);

    await expect(deleteSet(lecturer.id, set.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
