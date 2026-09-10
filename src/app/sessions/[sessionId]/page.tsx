import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireLecturer } from "@/lib/auth/session";
import { NotFoundError, getSession } from "@/lib/sessions/session-service";
import { JoinInfo } from "@/app/sessions/_components/join-info";
import { CancelSessionButton } from "@/app/sessions/_components/cancel-session-button";

export default async function SessionControlPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const lecturer = await requireLecturer();
  if (!lecturer) {
    redirect("/login");
  }

  const { sessionId } = await params;

  let session;
  try {
    session = await getSession(lecturer.id, sessionId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const presentationUrl = `/sessions/${session.id}/presentation`;

  return (
    <main>
      <h1>{session.title}</h1>
      <p>{session.type === "SURVEY" ? "Survey Session" : "Quiz Session"}</p>
      <p>Display mode: {session.displayMode === "SPLIT" ? "Split" : "Combined"}</p>

      {session.displayMode === "SPLIT" ? (
        <p>
          Open the <Link href={presentationUrl}>Presentation view</Link> on the screen the class
          can see. This page stays private to you.
        </p>
      ) : (
        <JoinInfo sessionId={session.id} joinCode={session.joinCode} />
      )}

      <section aria-label="Lecturer controls">
        <h2>Controls</h2>
        <p>Opening, closing, and advancing Questions will appear here once a lecture begins.</p>
        <CancelSessionButton sessionId={session.id} />
      </section>
    </main>
  );
}
