"use client";

import { useState } from "react";
import type { SetType } from "@/lib/sets/set-service";

type OptionDraft = { text: string; isCorrect: boolean };
type QuestionDraft = { id: string; prompt: string; options: OptionDraft[] };

function blankOptions(): OptionDraft[] {
  return [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ];
}

export function QuestionForm({
  setId,
  setType,
  initialQuestion,
  onDone,
  onCancel,
}: {
  setId: string;
  setType: SetType;
  initialQuestion?: QuestionDraft;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState(initialQuestion?.prompt ?? "");
  const [options, setOptions] = useState<OptionDraft[]>(
    initialQuestion?.options ?? blankOptions()
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateOptionText(index: number, text: string) {
    setOptions((current) => current.map((option, i) => (i === index ? { ...option, text } : option)));
  }

  function setCorrectOption(index: number) {
    setOptions((current) => current.map((option, i) => ({ ...option, isCorrect: i === index })));
  }

  function addOption() {
    setOptions((current) => [...current, { text: "", isCorrect: false }]);
  }

  function removeOption(index: number) {
    setOptions((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const endpoint = initialQuestion
      ? `/api/sets/${setId}/questions/${initialQuestion.id}`
      : `/api/sets/${setId}/questions`;
    const method = initialQuestion ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, options }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Something went wrong" }));
      setError(body.error ?? "Something went wrong");
      return;
    }

    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="field">
        <label>Prompt</label>
        <input
          className="input"
          type="text"
          required
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </div>

      <fieldset style={{ border: "2px solid var(--color-text)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <legend style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>
          Answer options{setType === "QUESTION" ? " (select the correct one)" : ""}
        </legend>
        {options.map((option, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {setType === "QUESTION" ? (
              <label
                className="radio"
                style={{ margin: 0 }}
                aria-label={`Mark option ${index + 1} as correct`}
              >
                <input
                  type="radio"
                  name="correct-option"
                  checked={option.isCorrect}
                  onChange={() => setCorrectOption(index)}
                />
                <span className="dot" />
              </label>
            ) : null}
            <input
              className="input"
              type="text"
              required
              value={option.text}
              onChange={(event) => updateOptionText(index, event.target.value)}
            />
            {options.length > 2 ? (
              <button type="button" className="btn btn-ghost" onClick={() => removeOption(index)}>
                Remove
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" className="btn btn-secondary" onClick={addOption}>
          Add option
        </button>
      </fieldset>

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {initialQuestion ? "Save question" : "Add question"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
