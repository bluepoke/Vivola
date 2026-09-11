import Link from "next/link";
import { redirect } from "next/navigation";
import { requireLecturer } from "@/lib/auth/session";
import { listPastSessionsForLecturer, sessionTypeLabel } from "@/lib/sessions/session-service";
import { SiteHeader } from "@/app/_components/site-header";
import { LogoutButton } from "@/app/_components/logout-button";

export default async function SessionHistoryPage() {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    redirect("/login");
  }

  const groups = await listPastSessionsForLecturer(lecturer.id);

  return (
    <>
      <SiteHeader
        nav={
          <>
            <Link href="/sets">My Sets</Link>
            <Link href="/sessions" aria-current="page">
              Past Sessions
            </Link>
            <LogoutButton />
          </>
        }
      />
      <main className="page">
        <h1>Past Sessions</h1>

        {groups.length === 0 ? (
          <p className="text-muted">You have no past Sessions yet.</p>
        ) : (
          groups.map((group) => (
            <section key={group.id} aria-label={group.setTitle} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 18 }}>{group.setTitle}</h2>
              <ul className="card-list">
                {group.sessions.map((session) => (
                  <li key={session.id}>
                    <Link className="card card-link" href={`/sessions/${session.id}`}>
                      <span className="card-title">{session.title}</span>
                      <span className="card-meta">
                        <span className="tag tag-neutral">{sessionTypeLabel(session.type)}</span>
                        {session.endedAt.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </>
  );
}
