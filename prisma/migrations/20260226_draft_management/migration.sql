-- ============================================================================
-- Migration: 001-draft-management
-- Branch: 001-draft-management
-- Date: 2026-02-26
-- Apply via: Neon dashboard → SQL editor (CLI blocked by OpenSSL 3.6.1)
-- ============================================================================

-- 1. Extend IdeaStatus enum
ALTER TYPE "IdeaStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'SUBMITTED';

-- 2. Extend AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DRAFT_SAVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DRAFT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DRAFT_SUBMITTED';

-- 3. Make idea fields nullable for draft support
ALTER TABLE "Idea" ALTER COLUMN "title" DROP NOT NULL;
ALTER TABLE "Idea" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "Idea" ALTER COLUMN "category" DROP NOT NULL;

-- 4. Add draft lifecycle columns
ALTER TABLE "Idea" ADD COLUMN IF NOT EXISTS "draftExpiresAt" TIMESTAMP(3);
ALTER TABLE "Idea" ADD COLUMN IF NOT EXISTS "isExpiredDraft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Idea" ADD COLUMN IF NOT EXISTS "softDeletedAt" TIMESTAMP(3);

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS "Idea_authorId_status_idx" ON "Idea"("authorId", "status");
CREATE INDEX IF NOT EXISTS "Idea_isExpiredDraft_draftExpiresAt_idx" ON "Idea"("isExpiredDraft", "draftExpiresAt");

-- ============================================================================
-- Verification: Run after applying
-- SELECT column_name, is_nullable, data_type FROM information_schema.columns
--   WHERE table_name = 'Idea' AND column_name IN ('title','description','category','draftExpiresAt','isExpiredDraft','softDeletedAt');
-- SELECT enum_range(NULL::"IdeaStatus");
-- SELECT enum_range(NULL::"AuditAction");
-- ============================================================================
