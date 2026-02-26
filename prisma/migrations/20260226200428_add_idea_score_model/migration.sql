-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'IDEA_SCORED';

-- CreateTable
CREATE TABLE "IdeaScore" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "criteria" TEXT[],
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdeaScore_ideaId_key" ON "IdeaScore"("ideaId");

-- CreateIndex
CREATE INDEX "IdeaScore_score_idx" ON "IdeaScore"("score");

-- AddForeignKey
ALTER TABLE "IdeaScore" ADD CONSTRAINT "IdeaScore_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaScore" ADD CONSTRAINT "IdeaScore_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint (EPIC-V2-06): score must be 1–5 — database-level safety net
ALTER TABLE "IdeaScore" ADD CONSTRAINT "IdeaScore_score_range" CHECK (score >= 1 AND score <= 5);
