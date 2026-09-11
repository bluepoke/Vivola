import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireLecturer } from "@/lib/auth/session";
import { NotFoundError, getSession, sessionTypeLabel } from "@/lib/sessions/session-service";
import { getAnswerCount, getQuestionAnalysis } from "@/lib/answers/answer-service";
import { getStudentCount } from "@/lib/students/student-service";
import { getLeaderboard } from "@/lib/leaderboard/leaderboard-service";
import { JoinInfo } from "@/app/sessions/_components/join-info";
import { CancelSessionButton } from "@/app/sessions/_components/cancel-session-button";
import { OpenQuestionButton } from "@/app/sessions/_components/open-question-button";
import { CloseQuestionButton } from "@/app/sessions/_components/close-question-button";
import { NextQuestionButton } from "@/app/sessions/_components/next-question-button";
import { EndSessionButton } from "@/app/sessions/_components/end-session-button";
import { SessionStage } from "@/app/sessions/_components/session-stage";
import { PastSessionAnalyses } from "@/app/sessions/_components/past-session-analyses";
import { SiteHeader } from "@/app/_components/site-header";
import { LogoutButton } from "@/app/_components/logout-button";

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

  const nav = (
    <>
      <Link href="/sets">My Sets</Link>
      <Link href="/sessions">Past Sessions</Link>
      <LogoutButton />
    </>
  );

  if (session.ended) {
    const [analyses, leaderboard] = await Promise.all([
      Promise.all(session.questions.map((question) => getQuestionAnalysis(question))),
      session.type === "QUESTION" ? getLeaderboard(session.id) : Promise.resolve(null),
    ]);

    return (
      <>
        <SiteHeader nav={nav} />
        <main className="page">
          <h1>{session.title}</h1>
          <p>
            <span className="tag tag-neutral">{sessionTypeLabel(session.type)}</span>{" "}
            <span className="tag tag-accent">Ended</span>
          </p>
          <PastSessionAnalyses sessionType={session.type} analyses={analyses} leaderboard={leaderboard} />
          <p style={{ marginTop: 24 }}>
            <Link href="/sessions">← Back to past Sessions</Link> ·{" "}
            <Link href="/sets">Start a new Session</Link>
          </p>
        </main>
      </>
    );
  }

  const presentationUrl = `/sessions/${session.id}/presentation`;

  const [answeredCount, totalStudents, analysis] = await Promise.all([
    session.openQuestion ? getAnswerCount(session.openQuestion.id) : Promise.resolve(0),
    getStudentCount(session.id),
    session.closedQuestion ? getQuestionAnalysis(session.closedQuestion) : Promise.resolve(null),
  ]);
  const leaderboard =
    session.type === "QUESTION" && session.closedQuestion ? await getLeaderboard(session.id) : null;

  return (
    <>
      <SiteHeader nav={nav} />
      <main className="page">
        <h1>{session.title}</h1>
        <p>
          <span className="tag tag-neutral">{sessionTypeLabel(session.type)}</span>{" "}
          <span className="tag tag-outline">
            {session.displayMode === "SPLIT" ? "Split" : "Combined"} display
          </span>
        </p>

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
            initialEnded={session.ended}
            lobby={<JoinInfo sessionId={session.id} joinCode={session.joinCode} />}
          />
        )}

        <section aria-label="Lecturer controls" className="card" style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16 }}>Controls</h2>
          {session.openQuestion ? (
            <>
              <p style={{ margin: 0 }}>Open Question: {session.openQuestion.prompt}</p>
              <CloseQuestionButton sessionId={session.id} />
            </>
          ) : session.closedQuestion ? (
            session.questions.at(-1)?.id !== session.closedQuestion.id && (
              <NextQuestionButton sessionId={session.id} />
            )
          ) : session.questions[0] ? (
            <OpenQuestionButton sessionId={session.id} questionId={session.questions[0].id} />
          ) : (
            <p className="text-muted">Add Questions to this Set before opening one.</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <EndSessionButton sessionId={session.id} />
            <CancelSessionButton sessionId={session.id} />
          </div>
        </section>
      </main>
    </>
  );
}
