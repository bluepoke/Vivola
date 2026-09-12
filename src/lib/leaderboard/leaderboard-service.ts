import { prisma } from "@/lib/db/client";

export const POINTS_PER_CORRECT_ANSWER = 1;

export type LeaderboardEntryView = { studentId: string; nickname: string | null; score: number };

// A single Answer's score: one point per correctly selected option, minus
// one point per incorrectly selected option, floored at zero so a badly
// guessed multi-select Answer can't drag a Student's total below what an
// unanswered Question would have scored (see ticket #10's scoring decision —
// partial credit per correct/incorrect option chosen). For a single-select
// Answer this reduces to the original all-or-nothing 1-or-0 behavior.
function scoreAnswer(answer: { selections: { answerOption: { isCorrect: boolean } }[] }): number {
  const correctSelected = answer.selections.filter((s) => s.answerOption.isCorrect).length;
  const incorrectSelected = answer.selections.length - correctSelected;
  return Math.max(0, correctSelected - incorrectSelected) * POINTS_PER_CORRECT_ANSWER;
}

// Quiz Session only — callers must gate on session.type === "QUESTION".
// A Survey Session's Students are never scored and never see a Leaderboard
// (see CONTEXT.md's Leaderboard definition). A Student who submitted no
// Answer to a Question simply has no Answer to score, so they score 0 for
// it while still appearing here (see CONTEXT.md's Answer definition).
export async function getLeaderboard(sessionId: string): Promise<LeaderboardEntryView[]> {
  const students = await prisma.student.findMany({
    where: { sessionId },
    include: { answers: { include: { selections: { include: { answerOption: true } } } } },
  });

  return students
    .map((student) => ({
      studentId: student.id,
      nickname: student.nickname,
      score: student.answers.reduce((total, answer) => total + scoreAnswer(answer), 0),
    }))
    .sort((a, b) => b.score - a.score);
}
