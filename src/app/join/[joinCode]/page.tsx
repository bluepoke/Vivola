import { notFound } from "next/navigation";
import { NotFoundError, getSessionByJoinCode } from "@/lib/sessions/session-service";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ joinCode: string }>;
}) {
  const { joinCode } = await params;

  let session;
  try {
    session = await getSessionByJoinCode(joinCode);
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
      <p>Joining isn&apos;t available yet — check back soon.</p>
    </main>
  );
}
