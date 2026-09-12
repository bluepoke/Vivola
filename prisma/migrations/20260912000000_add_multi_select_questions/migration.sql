-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_SELECT', 'MULTI_SELECT');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "type" "QuestionType" NOT NULL DEFAULT 'SINGLE_SELECT';

-- AlterTable
-- Existing SessionQuestion rows predate multi-select, so they all backfill to
-- SINGLE_SELECT before the column is made required.
ALTER TABLE "SessionQuestion" ADD COLUMN     "type" "QuestionType";
UPDATE "SessionQuestion" SET "type" = 'SINGLE_SELECT' WHERE "type" IS NULL;
ALTER TABLE "SessionQuestion" ALTER COLUMN "type" SET NOT NULL;

-- CreateTable
CREATE TABLE "AnswerSelection" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "answerOptionId" TEXT NOT NULL,

    CONSTRAINT "AnswerSelection_pkey" PRIMARY KEY ("id")
);

-- Backfill: every existing Answer had exactly one answerOptionId, so it
-- becomes a single AnswerSelection row before that column is dropped below.
INSERT INTO "AnswerSelection" ("id", "answerId", "answerOptionId")
SELECT gen_random_uuid()::text, "id", "answerOptionId" FROM "Answer" WHERE "answerOptionId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_answerOptionId_fkey";

-- DropIndex
DROP INDEX "Answer_answerOptionId_idx";

-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "answerOptionId";

-- CreateIndex
CREATE INDEX "AnswerSelection_answerOptionId_idx" ON "AnswerSelection"("answerOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerSelection_answerId_answerOptionId_key" ON "AnswerSelection"("answerId", "answerOptionId");

-- AddForeignKey
ALTER TABLE "AnswerSelection" ADD CONSTRAINT "AnswerSelection_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerSelection" ADD CONSTRAINT "AnswerSelection_answerOptionId_fkey" FOREIGN KEY ("answerOptionId") REFERENCES "SessionAnswerOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
