import type { QuestionAnalysisView } from "@/lib/answers/answer-service";
import type { LeaderboardEntryView } from "@/lib/leaderboard/leaderboard-service";
import { Leaderboard } from "@/app/_components/leaderboard";

// Renders a closed Question's Analysis — the answer distribution, and (for a
// Question Set) the correct answer — shared between the Presentation view,
// the Lecturer control view, and each Student's own device. `ownAnswerOptionId`
// and `showCorrectAnswer` are per-viewer: a Student's device highlights their
// own Answer and its correctness, while the shared views show neither.
export function QuestionAnalysis({
  analysis,
  showCorrectAnswer,
  ownAnswerOptionId = null,
  leaderboard = null,
}: {
  analysis: QuestionAnalysisView;
  showCorrectAnswer: boolean;
  ownAnswerOptionId?: string | null;
  leaderboard?: LeaderboardEntryView[] | null;
}) {
  return (
    <section aria-label="Analysis">
      <h2>{analysis.prompt}</h2>
      <ul>
        {analysis.options.map((option) => {
          const isOwnAnswer = option.id === ownAnswerOptionId;
          return (
            <li key={option.id}>
              {option.text}: {option.count}
              {showCorrectAnswer && option.isCorrect && " — Correct answer"}
              {isOwnAnswer && " (Your Answer"}
              {isOwnAnswer && showCorrectAnswer && (option.isCorrect ? ", correct!" : ", incorrect")}
              {isOwnAnswer && ")"}
            </li>
          );
        })}
      </ul>
      <p>
        {analysis.totalAnswered} student{analysis.totalAnswered === 1 ? "" : "s"} answered.
      </p>
      {leaderboard && (
        <section aria-label="Leaderboard">
          <h3>Leaderboard</h3>
          <Leaderboard entries={leaderboard} />
        </section>
      )}
    </section>
  );
}
