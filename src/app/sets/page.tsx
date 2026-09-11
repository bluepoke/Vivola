import Link from "next/link";
import { redirect } from "next/navigation";
import { requireLecturer } from "@/lib/auth/session";
import { listSets } from "@/lib/sets/set-service";
import { getActiveSessionForLecturer } from "@/lib/sessions/session-service";
import { CreateSetForm } from "@/app/sets/_components/create-set-form";
import { SiteHeader } from "@/app/_components/site-header";
import { LogoutButton } from "@/app/_components/logout-button";

export default async function SetsPage() {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    redirect("/login");
  }

  const [sets, activeSession] = await Promise.all([
    listSets(lecturer.id),
    getActiveSessionForLecturer(lecturer.id),
  ]);

  return (
    <>
      <SiteHeader
        nav={
          <>
            <Link href="/sets" aria-current="page">
              My Sets
            </Link>
            <Link href="/sessions">Past Sessions</Link>
            <LogoutButton />
          </>
        }
      />
      <main className="page">
        <h1>My Sets</h1>

        {activeSession ? (
          <p>
            <span className="tag tag-accent">Active Session</span>{" "}
            <Link href={`/sessions/${activeSession.id}`}>{activeSession.title}</Link>
          </p>
        ) : null}

        <ul className="card-list" style={{ marginBottom: 32 }}>
          {sets.map((set) => (
            <li key={set.id}>
              <Link className="card card-link" href={`/sets/${set.id}`}>
                <span className="card-kicker">{set.type === "SURVEY" ? "Survey Set" : "Question Set"}</span>
                <span className="card-title">{set.title}</span>
                <span className="card-meta">
                  {set.questionCount} question{set.questionCount === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <h2>Create a new Set</h2>
        <CreateSetForm />
      </main>
    </>
  );
}
