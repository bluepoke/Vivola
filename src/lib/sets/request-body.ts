import type { QuestionInput } from "@/lib/sets/set-service";

function isAnswerOption(value: unknown): value is { text: string; isCorrect?: boolean } {
  if (typeof value !== "object" || value === null) return false;
  const option = value as Record<string, unknown>;
  return (
    typeof option.text === "string" &&
    (option.isCorrect === undefined || typeof option.isCorrect === "boolean")
  );
}

function isQuestionType(value: unknown): value is "SINGLE_SELECT" | "MULTI_SELECT" {
  return value === "SINGLE_SELECT" || value === "MULTI_SELECT";
}

export async function parseQuestionInput(request: Request): Promise<QuestionInput | null> {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.prompt !== "string" ||
    (body.type !== undefined && !isQuestionType(body.type)) ||
    !Array.isArray(body.options) ||
    !body.options.every(isAnswerOption)
  ) {
    return null;
  }
  return { prompt: body.prompt, type: body.type, options: body.options };
}
