import { notFound } from "next/navigation";
import { NotFoundError, getPublicSession } from "@/lib/sessions/session-service";
import { getAnswerCount, getQuestionAnalysis } from "@/lib/answers/answer-service";
import { getStudentCount } from "@/lib/students/student-service";
import { getLeaderboard } from "@/lib/leaderboard/leaderboard-service";
import { JoinInfo } from "@/app/sessions/_components/join-info";
import { SessionStage } from "@/app/sessions/_components/session-stage";
import { SiteHeader } from "@/app/_components/site-header";
import { sessionTypeLabel } from "@/lib/sessions/session-service";

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

  const [answeredCount, totalStudents, analysis] = await Promise.all([
    session.openQuestion ? getAnswerCount(session.openQuestion.id) : Promise.resolve(0),
    getStudentCount(session.id),
    session.closedQuestion ? getQuestionAnalysis(session.closedQuestion) : Promise.resolve(null),
  ]);
  const leaderboard =
    session.type === "QUESTION" && (session.closedQuestion || session.ended)
      ? await getLeaderboard(session.id)
      : null;

  return (
    <>
      <SiteHeader />
      <main className="page" style={{ textAlign: "center" }}>
        <h1>{session.title}</h1>
        <p>
          <span className="tag tag-neutral">{sessionTypeLabel(session.type)}</span>
        </p>
        <div style={{ textAlign: "left", maxWidth: 560, margin: "0 auto" }}>
          <SessionStage
            sessionId={session.id}
            sessionType={session.type}
            initialQuestion={session.openQuestion}
            initialAnsweredCount={answeredCount}
            initialTotalStudents={totalStudents}
            initialAnalysis={analysis}
            initialLeaderboard={leaderboard}
            initialEnded={session.ended}
            lobby={<JoinInfo sessionId={session.id} joinCode={session.joinCode} />}
          />
        </div>
      </main>
    </>
  );
}
