import { notFound } from "next/navigation";
import { NotFoundError, getSessionByJoinCode } from "@/lib/sessions/session-service";
import { getStudentInSession } from "@/lib/students/student-service";
import { getAnswerForStudent, getQuestionAnalysis } from "@/lib/answers/answer-service";
import { getLeaderboard } from "@/lib/leaderboard/leaderboard-service";
import { getJoinedStudent } from "@/lib/auth/student-session";
import { JoinForm } from "@/app/join/_components/join-form";
import { QuestionStage } from "@/app/join/_components/question-stage";
import { SessionEnded } from "@/app/_components/session-ended";

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

  const joined = await getJoinedStudent();
  const student =
    joined && joined.sessionId === session.id
      ? await getStudentInSession(session.id, joined.studentId)
      : null;

  const relevantQuestionId = session.openQuestion?.id ?? session.closedQuestion?.id ?? null;
  const answeredOptionId =
    student && relevantQuestionId
      ? (await getAnswerForStudent(relevantQuestionId, student.id))?.answerOptionId ?? null
      : null;

  const closedAnalysis = session.closedQuestion ? await getQuestionAnalysis(session.closedQuestion) : null;
  const leaderboard =
    session.type === "QUESTION" && (session.closedQuestion || session.ended)
      ? await getLeaderboard(session.id)
      : null;

  return (
    <main>
      <h1>{session.title}</h1>
      <p>{session.type === "SURVEY" ? "Survey Session" : "Quiz Session"}</p>

      {session.ended && !student ? (
        <SessionEnded sessionType={session.type} leaderboard={leaderboard} />
      ) : student ? (
        <QuestionStage
          sessionId={session.id}
          sessionType={session.type}
          initialQuestion={session.openQuestion}
          answeredOptionId={answeredOptionId}
          initialClosedAnalysis={closedAnalysis}
          initialLeaderboard={leaderboard}
          initialEnded={session.ended}
          lobby={
            <section aria-label="Lobby">
              {student.nickname && (
                <p>
                  You&apos;re in as <strong>{student.nickname}</strong>.
                </p>
              )}
              <p>You&apos;re in! Waiting for the Lecturer to start the first Question&hellip;</p>
            </section>
          }
        />
      ) : (
        <JoinForm joinCode={joinCode} sessionType={session.type} />
      )}
    </main>
  );
}
