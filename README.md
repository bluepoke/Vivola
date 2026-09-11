<p align="center">
  <img src="img/VIVOLA_logo.svg" alt="Vivola logo" width="240">
</p>

<p align="center">
  A live classroom survey and quiz web application.
</p>

## What is Vivola?

Lecturers author question sets ahead of time, run them live during a lecture, and students join from their own devices to answer in real time — no setup friction, no accounts for students.

- **Survey Set** — opinion-style questions with no correct answer.
- **Question Set** — quiz-style questions with a scored correct answer.
- Students join instantly by scanning a QR code: anonymously for a **Survey Session**, with a nickname for a **Quiz Session**.
- The lecturer opens one question at a time; students answer on their own device; closing the question reveals the **Analysis** (answer distribution) to everyone, plus a **Leaderboard** for quizzes.
- Past sessions and their results are saved for the lecturer to review later.

See [`CONTEXT.md`](CONTEXT.md) for the full domain vocabulary and [`docs/spec-live-surveys-and-quizzes-mvp.md`](docs/spec-live-surveys-and-quizzes-mvp.md) for the original MVP scoping.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router) + [React](https://react.dev/), served through a custom [`server.ts`](server.ts)
- [Socket.IO](https://socket.io/) for live, per-session updates to connected clients
- [Prisma](https://www.prisma.io/) + PostgreSQL for persistence
- [Zod](https://zod.dev/) for validation, [iron-session](https://github.com/vvo/iron-session) for lecturer auth sessions
- [Vitest](https://vitest.dev/) for tests, [TypeScript](https://www.typescriptlang.org/) throughout

## Getting started

### Prerequisites

- Node.js
- Docker (for the local PostgreSQL database), or your own PostgreSQL instance

### Setup

```bash
npm install
cp .env.example .env
docker compose up -d      # starts local PostgreSQL
npm run prisma:migrate    # applies migrations
npm run dev                # starts the app at http://localhost:3000
```

Fill in `.env` with your own values — see `.env.example` for what's required (`DATABASE_URL`, `SESSION_SECRET`, and `APP_BASE_URL` for non-local deployments behind a proxy).

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the app locally with live reload |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | Type-check without emitting |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:migrate` | Apply/create local database migrations |

## License

[MIT](LICENSE) © Peter Kossek
