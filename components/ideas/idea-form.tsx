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

import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES, type CategorySlug } from '@/constants/categories'
import { CreateIdeaSchema } from '@/lib/validations/idea'
import { createIdeaAction } from '@/lib/actions/create-idea'

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

interface IdeaFormProps {
  /** When true, renders the optional file attachment field (T013) */
  attachmentEnabled: boolean
}

export default function IdeaForm({ attachmentEnabled }: IdeaFormProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    category: '',
    visibility: 'PUBLIC',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ─── Field helpers ────────────────────────────────────────────────────────

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // Clear field error on change
    setErrors((prev) => ({ ...prev, [name]: undefined }))
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
      const formData = new FormData()
      formData.append('title', parsed.data.title)
      formData.append('description', parsed.data.description)
      formData.append('category', parsed.data.category)
      formData.append('visibility', parsed.data.visibility)
      if (file) {
        formData.append('attachment', file)
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

      {/* File attachment (T013) — rendered only when flag is on */}
      {attachmentEnabled && (
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

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed"
        style={{
          background: submitting ? '#0070f3' : 'linear-gradient(135deg, #00c8ff, #0070f3)',
          opacity: submitting ? 0.7 : 1,
          boxShadow: '0 2px 16px rgba(0,200,255,0.2)',
        }}
      >
        {submitting ? 'Submitting…' : 'Submit Idea'}
      </button>
    </form>
  )
}
