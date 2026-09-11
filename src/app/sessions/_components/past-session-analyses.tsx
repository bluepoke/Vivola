import type { QuestionAnalysisView } from "@/lib/answers/answer-service";
import type { LeaderboardEntryView } from "@/lib/leaderboard/leaderboard-service";
import type { SetType } from "@/lib/sessions/session-service";
import { QuestionAnalysis } from "@/app/_components/question-analysis";
import { Leaderboard } from "@/app/_components/leaderboard";

// Shown when a Lecturer opens a past (ended) Session: the recorded
// per-Question Analysis for every Question, in fixed authoring order, plus
// the final Leaderboard for a Quiz Session (see CONTEXT.md). Unlike the live
// SessionStage, this is plain server-rendered data — an ended Session's
// results never change again, so there's nothing to subscribe to.
export function PastSessionAnalyses({
  sessionType,
  analyses,
  leaderboard,
}: {
  sessionType: SetType;
  analyses: QuestionAnalysisView[];
  leaderboard: LeaderboardEntryView[] | null;
}) {
  return (
    <section aria-label="Past Session">
      {analyses.map((analysis) => (
        <QuestionAnalysis key={analysis.id} analysis={analysis} showCorrectAnswer={sessionType === "QUESTION"} />
      ))}
      {sessionType === "QUESTION" && (
        <section aria-label="Final leaderboard">
          <h2>Final Leaderboard</h2>
          <Leaderboard entries={leaderboard} />
        </section>
      )}
    </section>
  );
}
