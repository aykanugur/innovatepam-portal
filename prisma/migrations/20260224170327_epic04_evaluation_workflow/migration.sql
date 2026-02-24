-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'IDEA_REVIEW_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'IDEA_REVIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'IDEA_REVIEW_ABANDONED';

-- DropForeignKey
ALTER TABLE "IdeaReview" DROP CONSTRAINT "IdeaReview_ideaId_fkey";

-- AlterTable
ALTER TABLE "IdeaReview" ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "decision" DROP NOT NULL,
ALTER COLUMN "comment" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "IdeaReview" ADD CONSTRAINT "IdeaReview_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
