import type { LeaderboardEntryView } from "@/lib/leaderboard/leaderboard-service";

// The ranked list of Students by score in a Quiz Session (see CONTEXT.md's
// Leaderboard definition), shared by every view that shows one: the live
// per-Question Analysis, the live end-of-Session summary, and a past
// Session's recorded results.
export function Leaderboard({ entries }: { entries: LeaderboardEntryView[] | null }) {
  return (
    <ol>
      {entries?.map((entry) => (
        <li key={entry.studentId}>
          {entry.nickname ?? "Anonymous"}: {entry.score}
        </li>
      ))}
    </ol>
  );
}
