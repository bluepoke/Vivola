import Link from "next/link";
import { redirect } from "next/navigation";
import { requireLecturer } from "@/lib/auth/session";
import { listPastSessionsForLecturer, sessionTypeLabel } from "@/lib/sessions/session-service";

export default async function SessionHistoryPage() {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    redirect("/login");
  }

  const groups = await listPastSessionsForLecturer(lecturer.id);

  return (
    <main>
      <h1>Past Sessions</h1>

      {groups.length === 0 ? (
        <p>You have no past Sessions yet.</p>
      ) : (
        groups.map((group) => (
          <section key={group.id} aria-label={group.setTitle}>
            <h2>{group.setTitle}</h2>
            <ul>
              {group.sessions.map((session) => (
                <li key={session.id}>
                  <Link href={`/sessions/${session.id}`}>{session.title}</Link>
                  {" — "}
                  {sessionTypeLabel(session.type)}
                  {" — "}
                  {session.endedAt.toLocaleString()}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
