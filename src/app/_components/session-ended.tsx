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
    <section aria-label="Session ended">
      <h2>Session ended</h2>
      {sessionType === "QUESTION" ? (
        <section aria-label="Leaderboard">
          <h3>Final Leaderboard</h3>
          <Leaderboard entries={leaderboard} />
        </section>
      ) : (
        <p>Thanks for participating!</p>
      )}
    </section>
  );
}
