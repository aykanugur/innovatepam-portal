-- AlterEnum: Add ATTACHMENT_DELETED to AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE 'ATTACHMENT_DELETED';

-- CreateTable: IdeaAttachment
CREATE TABLE "IdeaAttachment" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique constraint on (ideaId, blobUrl)
CREATE UNIQUE INDEX "IdeaAttachment_ideaId_blobUrl_key" ON "IdeaAttachment"("ideaId", "blobUrl");

-- CreateIndex: index on ideaId for lookups
CREATE INDEX "IdeaAttachment_ideaId_idx" ON "IdeaAttachment"("ideaId");

-- AddForeignKey: IdeaAttachment → Idea (cascade delete)
ALTER TABLE "IdeaAttachment" ADD CONSTRAINT "IdeaAttachment_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: IdeaAttachment → User
ALTER TABLE "IdeaAttachment" ADD CONSTRAINT "IdeaAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
