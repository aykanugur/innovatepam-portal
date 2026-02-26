-- CreateEnum
CREATE TYPE "StageOutcome" AS ENUM ('PASS', 'ESCALATE', 'ACCEPTED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'STAGE_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'STAGE_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'PIPELINE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PIPELINE_UPDATED';

-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "dynamicFields" JSONB;

-- CreateTable
CREATE TABLE "CategoryFieldTemplate" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryFieldTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewPipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewPipelineStage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "isDecisionStage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewPipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaStageProgress" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "outcome" "StageOutcome",
    "comment" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaStageProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryFieldTemplate_category_key" ON "CategoryFieldTemplate"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewPipeline_categorySlug_key" ON "ReviewPipeline"("categorySlug");

-- CreateIndex
CREATE INDEX "ReviewPipelineStage_pipelineId_order_idx" ON "ReviewPipelineStage"("pipelineId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewPipelineStage_pipelineId_order_key" ON "ReviewPipelineStage"("pipelineId", "order");

-- CreateIndex
CREATE INDEX "IdeaStageProgress_ideaId_idx" ON "IdeaStageProgress"("ideaId");

-- CreateIndex
CREATE INDEX "IdeaStageProgress_stageId_idx" ON "IdeaStageProgress"("stageId");

-- CreateIndex
CREATE INDEX "IdeaStageProgress_outcome_idx" ON "IdeaStageProgress"("outcome");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaStageProgress_ideaId_stageId_key" ON "IdeaStageProgress"("ideaId", "stageId");

-- AddForeignKey
ALTER TABLE "ReviewPipelineStage" ADD CONSTRAINT "ReviewPipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "ReviewPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaStageProgress" ADD CONSTRAINT "IdeaStageProgress_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaStageProgress" ADD CONSTRAINT "IdeaStageProgress_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ReviewPipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaStageProgress" ADD CONSTRAINT "IdeaStageProgress_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
