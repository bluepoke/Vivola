import { notFound } from "next/navigation";
import { NotFoundError, getPublicSession } from "@/lib/sessions/session-service";
import { getAnswerCount, getQuestionAnalysis } from "@/lib/answers/answer-service";
import { getStudentCount } from "@/lib/students/student-service";
import { getLeaderboard } from "@/lib/leaderboard/leaderboard-service";
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

  const [answeredCount, totalStudents, analysis] = await Promise.all([
    session.openQuestion ? getAnswerCount(session.openQuestion.id) : Promise.resolve(0),
    getStudentCount(session.id),
    session.closedQuestion ? getQuestionAnalysis(session.closedQuestion) : Promise.resolve(null),
  ]);
  const leaderboard =
    session.closedQuestion && session.type === "QUESTION" ? await getLeaderboard(session.id) : null;

  return (
    <main>
      <h1>{session.title}</h1>
      <p>{session.type === "SURVEY" ? "Survey Session" : "Quiz Session"}</p>
      <SessionStage
        sessionId={session.id}
        sessionType={session.type}
        initialQuestion={session.openQuestion}
        initialAnsweredCount={answeredCount}
        initialTotalStudents={totalStudents}
        initialAnalysis={analysis}
        initialLeaderboard={leaderboard}
        lobby={<JoinInfo sessionId={session.id} joinCode={session.joinCode} />}
      />
    </main>
  );
}
