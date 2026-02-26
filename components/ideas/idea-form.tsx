'use client'

/**
 * T009/T013 — Idea submission form component.
 * Controlled form covering title, description, category, visibility, and
 * (when FEATURE_FILE_ATTACHMENT_ENABLED=true) an optional file attachment.
 *
 * Validation: inline on blur via CreateIdeaSchema; submit button locked after
 * first click to prevent double-submission (FR-004).
 * Character counters on title (max 100) and description (max 2,000) — FR-002.
 * File attachment: PDF/PNG/JPG/DOCX/MD; max 5 MB — FR-005/FR-006/FR-008.
 */

import { useState, useRef, useCallback, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES, type CategorySlug } from '@/constants/categories'
import { CreateIdeaSchema } from '@/lib/validations/idea'
import { createIdeaAction } from '@/lib/actions/create-idea'
import { saveDraft } from '@/lib/actions/save-draft'
import { submitDraft } from '@/lib/actions/submit-draft'
import DynamicFieldSection from '@/components/ideas/dynamic-field-section'
import { DropZoneUploader } from '@/components/ideas/drop-zone-uploader'
import type { FieldDefinition } from '@/types/field-template'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  title: string
  description: string
  category: CategorySlug | ''
  visibility: 'PUBLIC' | 'PRIVATE'
}

interface FormErrors {
  title?: string
  description?: string
  category?: string
  visibility?: string
  attachment?: string
  general?: string
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain', // .md files may be identified as text/plain
]
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

interface DraftFeedback {
  type: 'success' | 'error'
  message: string
}

interface IdeaFormProps {
  /** When true, renders the optional file attachment field (T013) */
  attachmentEnabled: boolean
  /**
   * T010 — Smart Forms: category field templates pre-loaded at RSC render time.
   * null when FEATURE_SMART_FORMS_ENABLED=false (FR-010).
   */
  templates?: Record<CategorySlug, FieldDefinition[]> | null
  /**
   * T010 — Multi-Attachments: when true, renders the DropZoneUploader in place
   * of the V1 single-file picker (FEATURE_MULTI_ATTACHMENT_ENABLED).
   */
  multiAttachmentEnabled?: boolean
  /**
   * T012 — Draft Management: pre-existing draft id when editing a saved draft.
   * undefined = new idea form.
   */
  draftId?: string
  /**
   * T012 — Draft Management: current user id for localStorage keying.
   */
  userId?: string
  /**
   * T012 — Draft Management: when true, renders the "Save Draft" button.
   * Derived from FEATURE_DRAFT_ENABLED env var at the server.
   */
  draftEnabled?: boolean
  /**
   * T014 — Pre-populate form fields when editing an existing draft.
   */
  initialValues?: Partial<FormState>
  /**
   * T020 — Draft Limit: number of active drafts the user currently has.
   * When >= 10, "Save Draft" is disabled with explanatory tooltip.
   */
  draftCount?: number
}

export default function IdeaForm({
  attachmentEnabled,
  templates,
  multiAttachmentEnabled,
  draftId,
  userId,
  draftEnabled = false,
  draftCount = 0,
  initialValues,
}: IdeaFormProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  // T012/T013 — tracks current draft id (may update after first save)
  const currentDraftIdRef = useRef<string | undefined>(draftId)

  const [form, setForm] = useState<FormState>({
    title: initialValues?.title ?? '',
    description: initialValues?.description ?? '',
    category: initialValues?.category ?? '',
    visibility: initialValues?.visibility ?? 'PUBLIC',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  // T010 — Smart Forms: controlled dynamic field values (FR-004)
  const [dynamicValues, setDynamicValues] = useState<Record<string, string | number>>({})
  const [dynamicErrors, setDynamicErrors] = useState<Record<string, string>>({})
  const [file, setFile] = useState<File | null>(null)
  // T010 — Multi-attachments: blobUrls from DropZoneUploader
  const [attachmentBlobUrls, setAttachmentBlobUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  // T012 — Save Draft state
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftFeedback, setDraftFeedback] = useState<DraftFeedback | null>(null)

  // T013 — 60-second localStorage auto-save (only after a draft exists server-side)
  useEffect(() => {
    if (!draftEnabled || !userId || !currentDraftIdRef.current) return
    const key = `draft_autosave_${userId}_${currentDraftIdRef.current}`
    const interval = setInterval(() => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            title: form.title,
            description: form.description,
            category: form.category,
            visibility: form.visibility,
            timestamp: Date.now(),
          })
        )
      } catch {
        // quota exceeded or private browsing — silently ignore
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [draftEnabled, userId, form])

  const handleUploadsChange = useCallback((urls: string[]) => {
    setAttachmentBlobUrls(urls)
  }, [])

  // ─── Field helpers ────────────────────────────────────────────────────────

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // Clear field error on change
    setErrors((prev) => ({ ...prev, [name]: undefined }))
    // FR-004: Reset only dynamic fields when category changes
    if (name === 'category') {
      setDynamicValues({})
      setDynamicErrors({})
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setErrors((prev) => ({ ...prev, attachment: undefined }))

    if (!selected) {
      setFile(null)
      return
    }

    // Client-side type check
    const isAllowedType =
      ALLOWED_TYPES.includes(selected.type) ||
      selected.name.endsWith('.md') ||
      selected.name.endsWith('.markdown')
    if (!isAllowedType) {
      setErrors((prev) => ({
        ...prev,
        attachment: 'Only PDF, PNG, JPG, DOCX, and MD files are accepted.',
      }))
      if (fileRef.current) fileRef.current.value = ''
      setFile(null)
      return
    }

    if (selected.size > MAX_FILE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        attachment: 'File must be under 5 MB.',
      }))
      if (fileRef.current) fileRef.current.value = ''
      setFile(null)
      return
    }

    setFile(selected)
  }

  // ─── Inline validation on blur ────────────────────────────────────────────

  function validateField(name: keyof FormState) {
    const partial = { [name]: form[name] }
    const result = CreateIdeaSchema.partial().safeParse(partial)
    if (!result.success) {
      const msg =
        result.error.flatten().fieldErrors[
          name as keyof ReturnType<typeof result.error.flatten>['fieldErrors']
        ]?.[0]
      setErrors((prev) => ({ ...prev, [name]: msg }))
    }
  }

  // ─── Save Draft ───────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    if (savingDraft || draftCount >= 10) return
    setSavingDraft(true)
    setDraftFeedback(null)
    try {
      const result = await saveDraft({
        id: currentDraftIdRef.current,
        title: form.title || null,
        description: form.description || null,
        category: form.category || null,
        visibility: form.visibility,
        dynamicFields: Object.keys(dynamicValues).length > 0 ? dynamicValues : null,
        attachmentUrls: multiAttachmentEnabled ? attachmentBlobUrls : undefined,
      })
      if ('error' in result) {
        setDraftFeedback({ type: 'error', message: result.error })
      } else {
        currentDraftIdRef.current = result.draftId
        setDraftFeedback({ type: 'success', message: 'Draft saved successfully.' })
        // Auto-dismiss success after 4 s
        setTimeout(() => setDraftFeedback(null), 4000)
      }
    } catch {
      setDraftFeedback({ type: 'error', message: 'Failed to save draft. Please try again.' })
    } finally {
      setSavingDraft(false)
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    // Full validation before submit
    const parsed = CreateIdeaSchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setErrors({
        title: fieldErrors.title?.[0],
        description: fieldErrors.description?.[0],
        category: fieldErrors.category?.[0],
        visibility: fieldErrors.visibility?.[0],
      })
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      // T018 — when editing a draft, submit via submitDraft() instead of createIdeaAction()
      if (currentDraftIdRef.current) {
        const result = await submitDraft(currentDraftIdRef.current, {
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          visibility: parsed.data.visibility,
        })
        if ('error' in result) {
          if ('fieldErrors' in result && result.fieldErrors) {
            const fe = result.fieldErrors as Record<string, string[]>
            setErrors({
              title: fe.title?.[0],
              description: fe.description?.[0],
              category: fe.category?.[0],
              general: result.error,
            })
          } else {
            setErrors({ general: result.error })
          }
          setSubmitting(false)
          return
        }
        // On success: clear localStorage auto-save key then redirect
        if (userId) {
          try {
            localStorage.removeItem(`draft_autosave_${userId}_${currentDraftIdRef.current}`)
          } catch {}
        }
        router.push(`/ideas/${result.ideaId}`)
        return
      }

      const formData = new FormData()
      formData.append('title', parsed.data.title)
      formData.append('description', parsed.data.description)
      formData.append('category', parsed.data.category)
      formData.append('visibility', parsed.data.visibility)
      // T010 — serialize dynamic fields if flag is on and values exist (FR-002)
      if (templates && Object.keys(dynamicValues).length > 0) {
        formData.append('dynamicFields', JSON.stringify(dynamicValues))
      }
      if (file) {
        formData.append('attachment', file)
      }
      // T010 — Multi-attachments: pass blobUrls collected from DropZoneUploader
      if (multiAttachmentEnabled && attachmentBlobUrls.length > 0) {
        formData.append('attachmentUrls', JSON.stringify(attachmentBlobUrls))
      }

      const result = await createIdeaAction(formData)

      if (result.error) {
        setErrors({ general: result.error })
        setSubmitting(false)
        return
      }

      if (result.id) {
        router.push(`/ideas/${result.id}`)
      }
    } catch {
      setErrors({ general: 'Something went wrong. Please try again.' })
      setSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {errors.general && (
        <div
          role="alert"
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'rgba(239,68,68,0.12)',
            color: '#F87171',
            border: '1px solid rgba(239,68,68,0.25)',
          }}
        >
          {errors.general}
        </div>
      )}

      {/* T012 — Draft save feedback banner */}
      {draftFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm"
          style={{
            background:
              draftFeedback.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            color: draftFeedback.type === 'success' ? '#4ade80' : '#F87171',
            border: `1px solid ${draftFeedback.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}
        >
          <span>{draftFeedback.message}</span>
          <button
            type="button"
            onClick={() => setDraftFeedback(null)}
            aria-label="Dismiss"
            className="ml-3 text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="title" className="block text-sm font-medium" style={{ color: '#C0C0D8' }}>
            Title <span aria-hidden>*</span>
          </label>
          <span className="text-xs" style={{ color: '#60607A' }}>
            {form.title.length}/100
          </span>
        </div>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={100}
          value={form.title}
          onChange={handleChange}
          onBlur={() => validateField('title')}
          aria-describedby={errors.title ? 'title-error' : undefined}
          aria-invalid={!!errors.title}
          className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
          style={{
            background: '#1A1A2A',
            border: errors.title
              ? '1px solid rgba(239,68,68,0.6)'
              : '1px solid rgba(255,255,255,0.1)',
            color: '#F0F0FA',
          }}
          placeholder="Concise summary of your idea"
        />
        {errors.title ? (
          <p id="title-error" role="alert" className="text-xs" style={{ color: '#F87171' }}>
            {errors.title}
          </p>
        ) : null}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="description"
            className="block text-sm font-medium"
            style={{ color: '#C0C0D8' }}
          >
            Description <span aria-hidden>*</span>
          </label>
          <span className="text-xs" style={{ color: '#60607A' }}>
            {form.description.length}/2,000
          </span>
        </div>
        <textarea
          id="description"
          name="description"
          rows={6}
          maxLength={2000}
          value={form.description}
          onChange={handleChange}
          onBlur={() => validateField('description')}
          aria-describedby={errors.description ? 'desc-error' : undefined}
          aria-invalid={!!errors.description}
          className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition resize-none"
          style={{
            background: '#1A1A2A',
            border: errors.description
              ? '1px solid rgba(239,68,68,0.6)'
              : '1px solid rgba(255,255,255,0.1)',
            color: '#F0F0FA',
          }}
          placeholder="Describe your idea in detail — the problem it solves, the expected impact…"
        />
        {errors.description ? (
          <p id="desc-error" role="alert" className="text-xs" style={{ color: '#F87171' }}>
            {errors.description}
          </p>
        ) : null}
      </div>

      {/* Category */}
      <div className="space-y-1">
        <label
          htmlFor="category"
          className="block text-sm font-medium"
          style={{ color: '#C0C0D8' }}
        >
          Category <span aria-hidden>*</span>
        </label>
        <select
          id="category"
          name="category"
          value={form.category}
          onChange={handleChange}
          onBlur={() => validateField('category')}
          aria-describedby={errors.category ? 'category-error' : undefined}
          aria-invalid={!!errors.category}
          className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
          style={{
            background: '#1A1A2A',
            border: errors.category
              ? '1px solid rgba(239,68,68,0.6)'
              : '1px solid rgba(255,255,255,0.1)',
            color: '#F0F0FA',
          }}
        >
          <option value="" disabled style={{ background: '#1A1A2A' }}>
            Select a category
          </option>
          {CATEGORIES.map(({ slug, label }) => (
            <option key={slug} value={slug} style={{ background: '#1A1A2A' }}>
              {label}
            </option>
          ))}
        </select>
        {errors.category ? (
          <p id="category-error" role="alert" className="text-xs" style={{ color: '#F87171' }}>
            {errors.category}
          </p>
        ) : null}
      </div>

      {/* T010 — Dynamic fields section (FR-003): pre-loaded, shown synchronously */}
      {templates && form.category && templates[form.category as CategorySlug] ? (
        <DynamicFieldSection
          fields={templates[form.category as CategorySlug]}
          values={dynamicValues}
          onChange={setDynamicValues}
          errors={dynamicErrors}
        />
      ) : null}

      {/* Visibility */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium" style={{ color: '#C0C0D8' }}>
          Visibility <span aria-hidden>*</span>
        </legend>
        <div className="flex gap-6">
          {(['PUBLIC', 'PRIVATE'] as const).map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="visibility"
                value={value}
                checked={form.visibility === value}
                onChange={handleChange}
                className="h-4 w-4"
                style={{ accentColor: '#00c8ff' }}
              />
              <span className="text-sm" style={{ color: '#F0F0FA' }}>
                {value === 'PUBLIC' ? 'Public' : 'Private'}
              </span>
              <span className="text-xs" style={{ color: '#60607A' }}>
                {value === 'PUBLIC' ? '(visible to all employees)' : '(only you and admins)'}
              </span>
            </label>
          ))}
        </div>
        {errors.visibility ? (
          <p role="alert" className="text-xs" style={{ color: '#F87171' }}>
            {errors.visibility}
          </p>
        ) : null}
      </fieldset>

      {/* File attachment (T013) — rendered only when V1 flag is on AND multi-attach is OFF */}
      {attachmentEnabled && !multiAttachmentEnabled && (
        <div className="space-y-1.5">
          <label
            htmlFor="attachment"
            className="block text-sm font-medium"
            style={{ color: '#C0C0D8' }}
          >
            Attachment{' '}
            <span className="font-normal" style={{ color: '#60607A' }}>
              (optional)
            </span>
          </label>

          {/* Drop-zone / file picker */}
          <div
            className="relative flex items-center gap-3 rounded-xl px-4 py-3 transition cursor-pointer"
            style={{
              background: '#1A1A2A',
              border: errors.attachment
                ? '1px solid rgba(239,68,68,0.6)'
                : '1px dashed rgba(0,200,255,0.25)',
            }}
            onClick={() => fileRef.current?.click()}
          >
            {/* Hidden native input */}
            <input
              ref={fileRef}
              id="attachment"
              name="attachment"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.docx,.md"
              onChange={handleFileChange}
              aria-describedby="attachment-hint attachment-error"
              className="sr-only"
            />

            {/* Icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: '#00c8ff', flexShrink: 0 }}
            >
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>

            {/* Label / filename */}
            {file ? (
              <span className="flex-1 truncate text-sm" style={{ color: '#F0F0FA' }}>
                {file.name}
              </span>
            ) : (
              <span className="flex-1 text-sm" style={{ color: '#60607A' }}>
                Click to attach a file
              </span>
            )}

            {/* Pill button or Clear button */}
            {file ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                  if (fileRef.current) fileRef.current.value = ''
                  setErrors((prev) => ({ ...prev, attachment: undefined }))
                }}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  color: '#F87171',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                Remove
              </button>
            ) : (
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: 'rgba(0,200,255,0.12)',
                  color: '#00c8ff',
                  border: '1px solid rgba(0,200,255,0.2)',
                }}
              >
                Browse
              </span>
            )}
          </div>

          <p id="attachment-hint" className="text-xs" style={{ color: '#60607A' }}>
            PDF, PNG, JPG, DOCX, or MD · max 5 MB
          </p>
          {errors.attachment ? (
            <p id="attachment-error" role="alert" className="text-xs" style={{ color: '#F87171' }}>
              {errors.attachment}
            </p>
          ) : null}
        </div>
      )}

      {/* Multi-attachment drop zone (T010) — shown only when feature flag on */}
      {multiAttachmentEnabled && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" style={{ color: '#C0C0D8' }}>
            Attachments{' '}
            <span className="font-normal" style={{ color: '#60607A' }}>
              (optional)
            </span>
          </label>
          <DropZoneUploader onUploadsChange={handleUploadsChange} disabled={submitting} />
        </div>
      )}

      {/* Submit + Save Draft action row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-full py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed"
          style={{
            background: submitting ? '#0070f3' : 'linear-gradient(135deg, #00c8ff, #0070f3)',
            opacity: submitting ? 0.7 : 1,
            boxShadow: '0 2px 16px rgba(0,200,255,0.2)',
          }}
        >
          {submitting ? 'Submitting…' : 'Submit Idea'}
        </button>

        {/* T012 — Save Draft button: only rendered when feature flag is on */}
        {draftEnabled && (
          <div className="relative">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || submitting || draftCount >= 10}
              aria-disabled={draftCount >= 10}
              title={
                draftCount >= 10
                  ? 'You have reached the maximum of 10 drafts. Please submit or delete a draft to continue.'
                  : undefined
              }
              className="w-full sm:w-auto rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: savingDraft || draftCount >= 10 ? '#60607A' : '#C0C0D8',
                opacity: draftCount >= 10 ? 0.5 : 1,
              }}
            >
              {savingDraft ? 'Saving…' : 'Save Draft'}
            </button>
            {/* T020 — Limit tooltip message below button */}
            {draftCount >= 10 && (
              <p className="mt-1 text-center text-xs" style={{ color: '#F87171' }}>
                10-draft limit reached
              </p>
            )}
          </div>
        )}
      </div>
    </form>
  )
}
