# Vivola

A live classroom survey and quiz web application. Lecturers author question sets, run them live during a lecture, and students join from their own devices to answer in real time.

## Language

### People

**Lecturer**:
The person who creates Sets, runs Sessions, and controls the pace of a lecture. Requires an account.
_Avoid_: Presenter, host, teacher

**Student**:
A person who joins a live Session from their own device to answer questions. Joins anonymously for a Survey Session, or with a nickname for a Quiz Session. Never has an account.
_Avoid_: Participant, user, attendee

### Templates

**Survey Set**:
A reusable, lecturer-authored template of opinion-style questions with no correct answer. Never mixed with Question Set questions.
_Avoid_: Quiz, poll, question set

**Question Set**:
A reusable, lecturer-authored template of quiz-style questions, each with exactly one marked correct answer. Never mixed with Survey Set questions.
_Avoid_: Survey, survey set

**Question**:
A single prompt with a set of possible answers, belonging to exactly one Set. For the MVP, always single-select multiple choice.
_Avoid_: Item, prompt

### Live runs

A bare "Session" is ambiguous — always say Survey Session or Quiz Session. A Session snapshots its Questions from the Set at start time, so later edits to the Set never change a past Session's results (see [ADR 0001](docs/adr/0001-sessions-snapshot-their-questions.md)). Joining is only possible before the lecturer opens the first Question; opening it closes joining automatically, with no separate action. Question order within a Session is fixed at authoring time — no live reordering or skipping.

**Survey Session**:
One live run of a Survey Set in front of a class. Students join anonymously; no scoring exists.
_Avoid_: Quiz session, survey, poll, session

**Quiz Session**:
One live run of a Question Set in front of a class. Students join with a nickname, unique within the Session; answers are scored against the Question's correct answer, and a leaderboard is shown after each question and again at the end.
_Avoid_: Survey session, quiz, session

**Answer**:
A Student's one-time, locked submission to an open Question. Cannot be changed once submitted. A Student who submits nothing before the Question closes scores 0 (Quiz Session) and is excluded from that Question's Analysis (both Session types), but remains in the Session for subsequent Questions.
_Avoid_: Response, submission

A Session's Questions, Answers, Analyses, and (for a Quiz Session) Leaderboard are persisted after it ends, so the lecturer can review them later from their account.

### Session views

**Display mode**:
A choice the lecturer makes each time they start a Session: Split or Combined.
_Avoid_: view mode

**Presentation view**:
The read-only, class-facing screen — QR code, the open Question, Analysis, Leaderboard — with no Session controls. Shown alone in Split mode; shown together with the Lecturer control view's controls in Combined mode.
_Avoid_: display, big screen, projector view

**Lecturer control view**:
The lecturer's screen with Session controls (start, close, next, end). In Split mode it is a separate, private screen; in Combined mode its controls sit in a bar alongside the Presentation view's content, on the one screen the class also sees.
_Avoid_: control panel, dashboard

### Results

**Analysis**:
The per-Question breakdown — answer distribution, and for a Quiz Session, the correct answer — shown on the Presentation view and mirrored to each Student's device after the lecturer closes a Question. A Student's own device additionally highlights their own Answer and, in a Quiz Session, whether it was correct.
_Avoid_: results, stats

**Leaderboard**:
The ranked list of Students by score in a Quiz Session, shown after each Question's Analysis and again at Session end. Does not exist for a Survey Session.
_Avoid_: rankings, scoreboard
