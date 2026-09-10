# Live Surveys and Quizzes — MVP

## Problem Statement

Lecturers have no easy way to get real-time feedback or check understanding from a whole class during a lecture. Asking for a show of hands is low-fidelity, doesn't scale to large lecture halls, and leaves no record. Lecturers need a way to pose a question to the room, have every student answer from their own device, and immediately see the aggregated results — either as an opinion gauge (a survey) or as a scored comprehension check (a quiz) — without any setup friction for students.

## Solution

A web app where a Lecturer authors a reusable set of questions ahead of time (a **Survey Set** for opinion questions, or a **Question Set** for quiz questions with correct answers), then runs it live in front of a class as a **Session**. Students join instantly by scanning a QR code — anonymously for a Survey Session, with a nickname for a Quiz Session — no account needed. The Lecturer opens one Question at a time; students answer on their own device; the Lecturer closes the Question and everyone sees the Analysis (and, for quizzes, a Leaderboard) before moving to the next Question. Results are saved so the Lecturer can review them after the lecture.

## User Stories

1. As a Lecturer, I want to create an account, so that my Sets and Session history are saved and only accessible to me.
2. As a Lecturer, I want to log in to my account, so that I can access my previously created Sets and past Session results.
3. As a Lecturer, I want to create a new Survey Set, so that I can prepare opinion-style questions ahead of a lecture.
4. As a Lecturer, I want to create a new Question Set, so that I can prepare quiz-style questions with correct answers ahead of a lecture.
5. As a Lecturer, I want to add a single-select multiple-choice Question to a Survey Set, so that I can gather my students' opinions.
6. As a Lecturer, I want to add a single-select multiple-choice Question to a Question Set and mark one answer as correct, so that student responses can be scored.
7. As a Lecturer, I want to edit or delete a Question within a Set before it's used in any Session, so that I can refine my content.
8. As a Lecturer, I want to edit a Set that has already been used in past Sessions, so that I can fix mistakes or update content for future lectures, without altering the recorded results of those past Sessions.
9. As a Lecturer, I want to order Questions within a Set at authoring time, so that I control the sequence they'll be presented in during a Session.
10. As a Lecturer, I want to delete a Set I no longer need, so that my list of Sets stays manageable.
11. As a Lecturer, I want to start a new Session (Survey Session or Quiz Session, matching the Set's type) from one of my Sets, so that I can run it live during my lecture.
12. As a Lecturer, I want to be prevented from starting a second Session while one is already active for me, so that I don't accidentally run two conflicting live sessions.
13. As a Lecturer, I want to choose a Display mode (Split or Combined) when I start a Session, so that the app matches whether I have a separate projector screen or just my own laptop.
14. As a Lecturer, I want the Presentation view to show a QR code and join link as soon as a Session starts, so that students can join easily.
15. As a Student, I want to scan the QR code (or open the join link) with my own device, so that I can join the live Session.
16. As a Student, I want to join a Survey Session anonymously, without entering any identifying information, so that I can participate without friction.
17. As a Student, I want to choose a nickname when joining a Quiz Session, so that I can be tracked and ranked across the Session's Questions.
18. As a Student, I want to be told if my chosen nickname is already taken in this Quiz Session and asked to pick another, so that the Leaderboard doesn't show duplicate names.
19. As a Student, I want to be prevented from joining a Session after the Lecturer has opened the first Question, so that the participant list is stable once the Session is underway.
20. As a Lecturer, I want opening the first Question to automatically close joining, so that I don't need a separate action to lock the participant list.
21. As a Lecturer, I want to open a Question so that it's displayed on the Presentation view and on each joined Student's device simultaneously.
22. As a Student, I want to see the open Question and its possible answers on my own device, so that I can read and answer it directly, regardless of my distance from the Presentation view.
23. As a Student, I want to select one answer and submit it, so that my response is recorded.
24. As a Student, I want my submitted Answer to be locked immediately, so that the scoring and Analysis are simple and fair for everyone.
25. As a Student, I want to be scored 0 for a Question I didn't answer before it closed (Quiz Session), so that the scoring rule stays consistent even when I miss a Question.
26. As a Lecturer, I want to close the currently open Question, so that no further Answers are accepted for it and the Analysis is computed.
27. As a Lecturer, I want to see the Analysis (answer distribution, and for a Question Set, the correct answer) on the Presentation view after closing a Question, so that the whole class can see the results together.
28. As a Student, I want the Analysis to be mirrored to my own device after the Question closes, so that I can see the results without needing to look at the shared screen.
29. As a Student, I want my own Answer, and (in a Quiz Session) whether it was correct, highlighted within the Analysis on my device, so that I get immediate personal feedback.
30. As a Student in a Quiz Session, I want to see an updated Leaderboard after each Question's Analysis, so that I can track how I'm doing relative to my classmates.
31. As a Lecturer, I want to advance to the next Question in the fixed order after reviewing a Question's Analysis, so that I can keep the Session moving at my own pace.
32. As a Lecturer, I want to end the Session explicitly, so that I control exactly when the live event concludes.
33. As a Lecturer, I want to see a final summary when I end a Quiz Session, including the final Leaderboard, so that I can wrap up with a clear result for the class.
34. As a Lecturer, I want to see a simple completion screen when I end a Survey Session, so that I have a clear signal the Session is over (no Leaderboard, since Survey Sessions aren't scored).
35. As a Student, I want to see the final summary (final Leaderboard for a Quiz Session, or a completion message for a Survey Session) on my own device when the Lecturer ends the Session, so that I know it's over without needing to look up.
36. As a Lecturer, I want to view the recorded results (per-Question Analysis, final Leaderboard) of a past Session from my account after it has ended, so that I can review how my students performed.
37. As a Lecturer, I want my list of past Sessions to be associated with the Set that spawned each one, so that I can find historical results for a given topic easily.
38. As a Lecturer using Combined display mode, I want my Session controls (start/close/next/end) visible in a bar on the one screen shared with the class, so that I can run the Session from a single device without needing a second screen.
39. As a Lecturer using Split display mode, I want my Session controls kept private on my own Lecturer control view, separate from the Presentation view shown to the class, so that only I can operate the Session.
40. As a Student, I want to be excluded from a Question's Analysis distribution if I didn't submit an Answer before it closed, so that the distribution accurately reflects only actual responses.

## Implementation Decisions

- **One seam: the Session Engine.** A single domain module owns every Session state transition — start (from a Set, snapshotting its Questions), join, open Question, submit Answer, close Question (compute Analysis), advance to next Question, end Session (compute final summary). It exposes a narrow command interface; persistence is accessed through a swappable interface (fake in-memory implementation for tests, real adapter in production). Everything else — REST/websocket transport, Presentation view, Lecturer control view, QR code generation, the real database adapter — is a thin layer wrapped around this module.
- **Snapshotting** (see [ADR 0001](adr/0001-sessions-snapshot-their-questions.md)): a Session copies its Questions (and, for a Question Set, correct answers) from the Set at start time. The Session's own copy is authoritative for its lifetime and its persisted history; later edits to the source Set never affect a past or in-progress Session.
- **One active Session per Lecturer**, enforced by the Session Engine — starting a new Session while one is active for that Lecturer is rejected.
- **Joining window**: open from Session start until the Lecturer opens the first Question. Opening Question 1 is the sole trigger that closes joining — there is no separate "close joining" command.
- **Nickname uniqueness** is enforced per Quiz Session (not globally, not across Sessions) at join time.
- **Answer immutability**: an Answer is accepted once per Student per Question and is locked on submission. The engine's interface has no "change answer" command.
- **Missed Questions**: a Student who submits no Answer before a Question closes scores 0 for it (Quiz Session) and is omitted from that Question's Analysis distribution (both Session types), but remains in the Session for subsequent Questions.
- **Fixed order**: Question order is set at authoring time; the engine has no reorder/skip command during a live Session.
- **Quiz scoring**: fixed points per correct Answer, correctness-only — no speed or time component.
- **Leaderboard**: Quiz Session only, recomputed and exposed after each Question's Analysis and again at Session end. Survey Sessions never expose a Leaderboard.
- **Display mode** (Split / Combined), chosen by the Lecturer at Session start, is purely a rendering/routing concern in the layer above the Session Engine (which client(s) receive the engine's state/events) — it does not change the engine's behavior.
- **Persistence of results**: a Session's Questions snapshot, Answers, Analyses, and (Quiz Session) Leaderboard persist past Session end for later Lecturer review, associated with both the Session and its originating Set.

## Testing Decisions

- Tests target the Session Engine's public command interface directly (start, join, openQuestion, submitAnswer, closeQuestion, nextQuestion, endSession) and assert on the state/events it returns — never on HTTP responses, websocket frames, or rendered UI.
- Persistence is swapped for an in-memory/fake implementation in tests; no test depends on a real database.
- This is a new codebase, so there's no prior art within the repo yet — this Session Engine seam is the pattern subsequent features should follow: test the domain module directly, keep transport/UI thin and untested at that level.
- Given the number of user stories, organize tests around the domain rules being enforced (late-join rejection, nickname uniqueness, answer immutability, snapshot isolation from Set edits, scoring, no-Leaderboard-for-Survey, exclusion of non-answerers from Analysis, one-active-Session-per-Lecturer) rather than one test per user story.

## Out of Scope

- Question types beyond single-select multiple choice (free text, numeric, multi-select, word cloud, etc.)
- Speed-based or time-decay scoring
- Live Question reordering or skipping during a Session
- Concurrent Sessions for a single Lecturer
- Late joining after the first Question opens
- Answer resubmission or editing
- Student accounts, login, or any cross-Session Student identity/history
- Exporting results (e.g. CSV) — only in-app review of past Sessions is in scope
- Time limits per Question
- Mixing Survey-style and Quiz-style Questions within a single Set

## Further Notes

- Tech stack (frontend/backend framework, real-time transport — websockets vs. SSE — and database) has not been decided yet; that's a separate decision to make before implementation starts, informed by the Session Engine seam above (needs to support push updates to multiple connected clients per Session).
- Domain vocabulary throughout this spec follows `CONTEXT.md`; see [ADR 0001](adr/0001-sessions-snapshot-their-questions.md) for the snapshotting decision.
