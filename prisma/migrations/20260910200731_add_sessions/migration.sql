-- CreateEnum
CREATE TYPE "DisplayMode" AS ENUM ('SPLIT', 'COMBINED');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "setId" TEXT,
    "type" "SetType" NOT NULL,
    "title" TEXT NOT NULL,
    "displayMode" "DisplayMode" NOT NULL,
    "joinCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SessionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAnswerOption" (
    "id" TEXT NOT NULL,
    "sessionQuestionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SessionAnswerOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_joinCode_key" ON "Session"("joinCode");

-- CreateIndex
CREATE INDEX "Session_lecturerId_idx" ON "Session"("lecturerId");

-- CreateIndex
CREATE INDEX "SessionQuestion_sessionId_idx" ON "SessionQuestion"("sessionId");

-- CreateIndex
CREATE INDEX "SessionAnswerOption_sessionQuestionId_idx" ON "SessionAnswerOption"("sessionQuestionId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionQuestion" ADD CONSTRAINT "SessionQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAnswerOption" ADD CONSTRAINT "SessionAnswerOption_sessionQuestionId_fkey" FOREIGN KEY ("sessionQuestionId") REFERENCES "SessionQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
