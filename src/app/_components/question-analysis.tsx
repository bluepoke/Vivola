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
    <section aria-label="Analysis" className="card" style={{ marginBottom: 16 }}>
      <h6 className="text-muted" style={{ margin: 0 }}>
        Analysis
      </h6>
      <h3 style={{ margin: 0 }}>{analysis.prompt}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {analysis.options.map((option) => {
          const isOwnAnswer = option.id === ownAnswerOptionId;
          const isCorrect = showCorrectAnswer && option.isCorrect;
          const pct = analysis.totalAnswered === 0 ? 0 : Math.round((option.count / analysis.totalAnswered) * 100);
          return (
            <div key={option.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                <span>
                  {option.text}
                  {isCorrect && <span style={{ color: "var(--color-accent-700)" }}> ✓ correct</span>}
                  {isOwnAnswer && (
                    <span className="tag tag-neutral" style={{ marginLeft: 8 }}>
                      Your Answer{showCorrectAnswer ? (option.isCorrect ? " · correct" : " · incorrect") : ""}
                    </span>
                  )}
                </span>
                <span>
                  {option.count} · {pct}%
                </span>
              </div>
              <div style={{ height: 20, background: "var(--color-neutral-200)" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: isCorrect ? "var(--color-accent)" : "var(--color-neutral-500)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-muted" style={{ margin: 0 }}>
        {analysis.totalAnswered} student{analysis.totalAnswered === 1 ? "" : "s"} answered.
      </p>
      {leaderboard && (
        <section aria-label="Leaderboard">
          <h3 style={{ fontSize: 17 }}>Leaderboard</h3>
          <Leaderboard entries={leaderboard} />
        </section>
      )}
    </section>
  );
}
