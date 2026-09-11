import { notFound } from "next/navigation";
import { NotFoundError, getPublicSession } from "@/lib/sessions/session-service";
import { getAnswerCount } from "@/lib/answers/answer-service";
import { getStudentCount } from "@/lib/students/student-service";
import { JoinInfo } from "@/app/sessions/_components/join-info";
import { SessionStage } from "@/app/sessions/_components/session-stage";

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

  const [answeredCount, totalStudents] = await Promise.all([
    session.openQuestion ? getAnswerCount(session.openQuestion.id) : Promise.resolve(0),
    getStudentCount(session.id),
  ]);

  return (
    <main>
      <h1>{session.title}</h1>
      <p>{session.type === "SURVEY" ? "Survey Session" : "Quiz Session"}</p>
      <SessionStage
        sessionId={session.id}
        initialQuestion={session.openQuestion}
        initialAnsweredCount={answeredCount}
        initialTotalStudents={totalStudents}
        lobby={<JoinInfo sessionId={session.id} joinCode={session.joinCode} />}
      />
    </main>
  );
}
