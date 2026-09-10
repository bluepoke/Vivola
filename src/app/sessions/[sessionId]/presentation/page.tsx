import { notFound } from "next/navigation";
import { NotFoundError, getPublicSession } from "@/lib/sessions/session-service";
import { JoinInfo } from "@/app/sessions/_components/join-info";

export default async function PresentationPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  let session;
  try {
    session = await getPublicSession(sessionId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <main>
      <h1>{session.title}</h1>
      <p>{session.type === "SURVEY" ? "Survey Session" : "Quiz Session"}</p>
      <JoinInfo sessionId={session.id} joinCode={session.joinCode} />
    </main>
  );
}
