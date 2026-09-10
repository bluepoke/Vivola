-- CreateEnum
CREATE TYPE "SetType" AS ENUM ('SURVEY', 'QUESTION');

-- CreateTable
CREATE TABLE "Set" (
    "id" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "type" "SetType" NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,

    CONSTRAINT "AnswerOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Set_lecturerId_idx" ON "Set"("lecturerId");

-- CreateIndex
CREATE INDEX "Question_setId_idx" ON "Question"("setId");

-- CreateIndex
CREATE INDEX "AnswerOption_questionId_idx" ON "AnswerOption"("questionId");

-- AddForeignKey
ALTER TABLE "Set" ADD CONSTRAINT "Set_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerOption" ADD CONSTRAINT "AnswerOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
