import { prisma } from "@/lib/db/client";

export const POINTS_PER_CORRECT_ANSWER = 1;

export type LeaderboardEntryView = { studentId: string; nickname: string | null; score: number };

// Quiz Session only — callers must gate on session.type === "QUESTION".
// A Survey Session's Students are never scored and never see a Leaderboard
// (see CONTEXT.md's Leaderboard definition). A Student who submitted no
// Answer to a Question simply has no correct Answer to count for it, so
// they score 0 for it while still appearing here (see CONTEXT.md's Answer
// definition).
export async function getLeaderboard(sessionId: string): Promise<LeaderboardEntryView[]> {
  const students = await prisma.student.findMany({
    where: { sessionId },
    include: { answers: { include: { answerOption: true } } },
  });

  return students
    .map((student) => ({
      studentId: student.id,
      nickname: student.nickname,
      score:
        student.answers.filter((answer) => answer.answerOption.isCorrect).length *
        POINTS_PER_CORRECT_ANSWER,
    }))
    .sort((a, b) => b.score - a.score);
}
