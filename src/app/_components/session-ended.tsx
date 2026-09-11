import type { SetType } from "@/lib/sessions/session-service";
import type { LeaderboardEntryView } from "@/lib/leaderboard/leaderboard-service";
import { Leaderboard } from "@/app/_components/leaderboard";

// The final summary shown to the Presentation view, every Student's device,
// and the Lecturer control view once the Lecturer ends the Session: the
// final Leaderboard for a Quiz Session, or a simple completion message for a
// Survey Session, which is never scored (see CONTEXT.md's Leaderboard
// definition).
export function SessionEnded({
  sessionType,
  leaderboard,
}: {
  sessionType: SetType;
  leaderboard: LeaderboardEntryView[] | null;
}) {
  return (
    <section aria-label="Session ended" className="card" style={{ textAlign: "center", gap: 16 }}>
      <span className="tag tag-neutral" style={{ alignSelf: "center" }}>
        Session complete
      </span>
      {sessionType === "QUESTION" ? (
        <section aria-label="Leaderboard" style={{ textAlign: "left" }}>
          <h3>Final Leaderboard</h3>
          <Leaderboard entries={leaderboard} />
        </section>
      ) : (
        <p style={{ margin: 0 }}>Thanks for participating!</p>
      )}
    </section>
  );
}
