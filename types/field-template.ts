/**
 * T001 — FieldDefinition interface and DynamicFields type.
 * Used across server (validation, seed) and client (DynamicFieldSection).
 * Source of truth: specs/001-smart-forms/data-model.md §3
 */

/** Supported input types for a dynamic field. */
export type FieldType = 'text' | 'textarea' | 'number' | 'select'

/** A single field definition within a CategoryFieldTemplate. */
export interface FieldDefinition {
  /** Kebab-case slug, unique within the template (e.g., "current_process"). */
  id: string
  /** Display label shown above the input. */
  label: string
  type: FieldType
  required: boolean
  /** Only present and non-empty for type === 'select'. */
  options?: string[]
}

/** The stored value type for a single dynamic field entry. */
export type DynamicFieldValue = string | number

/**
 * The shape stored in Idea.dynamicFields (key → value map).
 * Keys are FieldDefinition.id values for the submitted category's template.
 * Optional fields omitted by the submitter are absent from the map (not null-keyed).
 */
export type DynamicFields = Record<string, DynamicFieldValue>
