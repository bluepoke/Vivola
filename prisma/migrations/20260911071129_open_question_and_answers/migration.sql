-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "firstQuestionOpenedAt" TIMESTAMP(3),
ADD COLUMN     "openQuestionId" TEXT;

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "sessionQuestionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answerOptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Answer_sessionQuestionId_studentId_key" ON "Answer"("sessionQuestionId", "studentId");

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_sessionQuestionId_fkey" FOREIGN KEY ("sessionQuestionId") REFERENCES "SessionQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_answerOptionId_fkey" FOREIGN KEY ("answerOptionId") REFERENCES "SessionAnswerOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
