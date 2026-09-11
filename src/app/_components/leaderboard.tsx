import type { LeaderboardEntryView } from "@/lib/leaderboard/leaderboard-service";

// The ranked list of Students by score in a Quiz Session (see CONTEXT.md's
// Leaderboard definition), shared by every view that shows one: the live
// per-Question Analysis, the live end-of-Session summary, and a past
// Session's recorded results.
export function Leaderboard({ entries }: { entries: LeaderboardEntryView[] | null }) {
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "2px solid var(--color-divider)" }}>
      {entries?.map((entry, index) => (
        <li
          key={entry.studentId}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 4px",
            borderBottom: "1px solid var(--color-divider)",
          }}
        >
          <span style={{ width: 20, fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 13 }}>
            {index + 1}
          </span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{entry.nickname ?? "Anonymous"}</span>
          <span style={{ fontSize: 13, fontWeight: 800 }}>{entry.score}</span>
        </li>
      ))}
    </ol>
  );
}
