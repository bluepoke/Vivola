import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireLecturer } from "@/lib/auth/session";
import { NotFoundError, getSession } from "@/lib/sessions/session-service";
import { getAnswerCount, getQuestionAnalysis } from "@/lib/answers/answer-service";
import { getStudentCount } from "@/lib/students/student-service";
import { getLeaderboard } from "@/lib/leaderboard/leaderboard-service";
import { JoinInfo } from "@/app/sessions/_components/join-info";
import { CancelSessionButton } from "@/app/sessions/_components/cancel-session-button";
import { OpenQuestionButton } from "@/app/sessions/_components/open-question-button";
import { CloseQuestionButton } from "@/app/sessions/_components/close-question-button";
import { NextQuestionButton } from "@/app/sessions/_components/next-question-button";
import { SessionStage } from "@/app/sessions/_components/session-stage";

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
      <p>Display mode: {session.displayMode === "SPLIT" ? "Split" : "Combined"}</p>

      {session.displayMode === "SPLIT" ? (
        <p>
          Open the <Link href={presentationUrl}>Presentation view</Link> on the screen the class
          can see. This page stays private to you.
        </p>
      ) : (
        <SessionStage
          sessionId={session.id}
          sessionType={session.type}
          initialQuestion={
            session.openQuestion
              ? {
                  id: session.openQuestion.id,
                  prompt: session.openQuestion.prompt,
                  options: session.openQuestion.options.map((option) => ({
                    id: option.id,
                    text: option.text,
                  })),
                }
              : null
          }
          initialAnsweredCount={answeredCount}
          initialTotalStudents={totalStudents}
          initialAnalysis={analysis}
          initialLeaderboard={leaderboard}
          lobby={<JoinInfo sessionId={session.id} joinCode={session.joinCode} />}
        />
      )}

      <section aria-label="Lecturer controls">
        <h2>Controls</h2>
        {session.openQuestion ? (
          <>
            <p>Open Question: {session.openQuestion.prompt}</p>
            <CloseQuestionButton sessionId={session.id} />
          </>
        ) : session.closedQuestion ? (
          session.questions.at(-1)?.id === session.closedQuestion.id ? (
            <p>Ending the Session will appear here as this feature grows.</p>
          ) : (
            <NextQuestionButton sessionId={session.id} />
          )
        ) : session.questions[0] ? (
          <OpenQuestionButton sessionId={session.id} questionId={session.questions[0].id} />
        ) : (
          <p>Add Questions to this Set before opening one.</p>
        )}
        <CancelSessionButton sessionId={session.id} />
      </section>
    </main>
  );
}
