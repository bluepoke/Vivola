import { notFound } from "next/navigation";
import { NotFoundError, getSessionByJoinCode } from "@/lib/sessions/session-service";
import { getStudentInSession } from "@/lib/students/student-service";
import { getAnswerForStudent } from "@/lib/answers/answer-service";
import { getJoinedStudent } from "@/lib/auth/student-session";
import { JoinForm } from "@/app/join/_components/join-form";
import { QuestionStage } from "@/app/join/_components/question-stage";

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

  const answeredOptionId =
    student && session.openQuestion
      ? (await getAnswerForStudent(session.openQuestion.id, student.id))?.answerOptionId ?? null
      : null;

  return (
    <main>
      <h1>{session.title}</h1>
      <p>{session.type === "SURVEY" ? "Survey Session" : "Quiz Session"}</p>

      {student ? (
        <QuestionStage
          sessionId={session.id}
          initialQuestion={session.openQuestion}
          answeredOptionId={answeredOptionId}
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
