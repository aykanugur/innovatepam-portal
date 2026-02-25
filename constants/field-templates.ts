/**
 * T003 — Category field templates constant.
 * Authoritative source for all 5 category dynamic-field definitions.
 * Used by: prisma/seed.ts (upsert), DynamicFieldSection (runtime), buildDynamicFieldsSchema (validation).
 * Source of truth: specs/001-smart-forms/data-model.md §4
 */
import type { FieldDefinition } from '@/types/field-template'
import type { CategorySlug } from '@/constants/categories'

export const CATEGORY_FIELD_TEMPLATES: Record<CategorySlug, FieldDefinition[]> = {
  'process-improvement': [
    {
      id: 'current_process',
      label: 'Describe the current process',
      type: 'textarea',
      required: true,
    },
    {
      id: 'time_saved_hours_per_week',
      label: 'Estimated time saved (hours/week)',
      type: 'number',
      required: false,
    },
  ],
  'new-product-service': [
    {
      id: 'target_market',
      label: 'Target market or audience',
      type: 'text',
      required: true,
    },
    {
      id: 'competitive_advantage',
      label: 'Key differentiator vs. alternatives',
      type: 'textarea',
      required: false,
    },
  ],
  'cost-reduction': [
    {
      id: 'current_annual_cost_usd',
      label: 'Current estimated annual cost (USD)',
      type: 'number',
      required: true,
    },
    {
      id: 'estimated_savings_pct',
      label: 'Estimated savings (%)',
      type: 'number',
      required: true,
    },
  ],
  'employee-experience': [
    {
      id: 'affected_group',
      label: 'Which employee group is affected?',
      type: 'text',
      required: true,
    },
    {
      id: 'pain_level',
      label: 'Current pain level',
      type: 'select',
      required: true,
      options: ['Low', 'Medium', 'High', 'Critical'],
    },
  ],
  'technical-innovation': [
    {
      id: 'problem_being_solved',
      label: 'Technical problem being solved',
      type: 'textarea',
      required: true,
    },
    {
      id: 'proposed_solution_summary',
      label: 'High-level technical approach',
      type: 'textarea',
      required: false,
    },
  ],
}
