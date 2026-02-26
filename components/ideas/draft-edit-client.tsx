'use client'

/**
 * T014 — Draft Management: client wrapper for the draft edit page.
 *
 * Manages shared state between the restore banner and the IdeaForm so that
 * "Yes, restore" can update the form's initialValues.
 */

import { useState } from 'react'
import IdeaForm from '@/components/ideas/idea-form'
import { DraftRestoreBanner } from '@/components/ideas/draft-restore-banner'
import type { CategorySlug } from '@/constants/categories'
import type { FieldDefinition } from '@/types/field-template'

interface DraftEditClientProps {
  draftId: string
  userId: string
  serverUpdatedAt: string
  initialValues: {
    title: string
    description: string
    category: CategorySlug | ''
    visibility: 'PUBLIC' | 'PRIVATE'
  }
  attachmentEnabled: boolean
  templates?: Record<CategorySlug, FieldDefinition[]> | null
  multiAttachmentEnabled?: boolean
  draftEnabled?: boolean
  draftCount?: number
}

export function DraftEditClient({
  draftId,
  userId,
  serverUpdatedAt,
  initialValues,
  attachmentEnabled,
  templates,
  multiAttachmentEnabled,
  draftEnabled,
  draftCount,
}: DraftEditClientProps) {
  const [formValues, setFormValues] = useState(initialValues)

  function handleRestore(snapshot: {
    title?: string
    description?: string
    category?: string
    visibility?: string
  }) {
    setFormValues((prev) => ({
      title: snapshot.title ?? prev.title,
      description: snapshot.description ?? prev.description,
      category: (snapshot.category as CategorySlug | '') ?? prev.category,
      visibility: (snapshot.visibility as 'PUBLIC' | 'PRIVATE') ?? prev.visibility,
    }))
  }

  return (
    <div className="space-y-4">
      <DraftRestoreBanner
        userId={userId}
        draftId={draftId}
        serverUpdatedAt={serverUpdatedAt}
        onRestore={handleRestore}
      />
      <IdeaForm
        attachmentEnabled={attachmentEnabled}
        templates={templates}
        multiAttachmentEnabled={multiAttachmentEnabled}
        draftId={draftId}
        userId={userId}
        draftEnabled={draftEnabled}
        draftCount={draftCount}
        initialValues={formValues}
      />
    </div>
  )
}
