"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QuestionForm } from "@/app/sets/_components/question-form";
import type { SetView } from "@/lib/sets/set-service";

export function SetDetail({ set }: { set: SetView }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [deleting, setDeleting] = useState(false);

  function refresh() {
    setEditingId(null);
    router.refresh();
  }

  async function handleDeleteQuestion(questionId: string) {
    await fetch(`/api/sets/${set.id}/questions/${questionId}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= set.questions.length) return;

    const ids = set.questions.map((question) => question.id);
    const reordered = [...ids];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved!);

    await fetch(`/api/sets/${set.id}/questions/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedQuestionIds: reordered }),
    });
    router.refresh();
  }

  async function handleDeleteSet() {
    if (!confirm(`Delete "${set.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/sets/${set.id}`, { method: "DELETE" });
    router.push("/sets");
    router.refresh();
  }

  return (
    <main>
      <h1>{set.title}</h1>
      <p>{set.type === "SURVEY" ? "Survey Set" : "Question Set"}</p>

      <ol>
        {set.questions.map((question, index) =>
          editingId === question.id ? (
            <li key={question.id}>
              <QuestionForm
                setId={set.id}
                setType={set.type}
                initialQuestion={question}
                onDone={refresh}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={question.id}>
              <p>{question.prompt}</p>
              <ul>
                {question.options.map((option) => (
                  <li key={option.id}>
                    {option.text}
                    {option.isCorrect ? " (correct)" : ""}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setEditingId(question.id)}>
                Edit
              </button>
              <button type="button" onClick={() => handleDeleteQuestion(question.id)}>
                Delete
              </button>
              <button type="button" disabled={index === 0} onClick={() => handleMove(index, -1)}>
                Move up
              </button>
              <button
                type="button"
                disabled={index === set.questions.length - 1}
                onClick={() => handleMove(index, 1)}
              >
                Move down
              </button>
            </li>
          )
        )}
      </ol>

      {editingId === "new" ? (
        <QuestionForm
          setId={set.id}
          setType={set.type}
          onDone={refresh}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <button type="button" onClick={() => setEditingId("new")}>
          Add question
        </button>
      )}

      <button type="button" onClick={handleDeleteSet} disabled={deleting}>
        Delete Set
      </button>
    </main>
  );
}
