/**
 * T012 — Unit tests for DynamicFieldSection component.
 * Covers: field-type rendering, ARIA attributes, error display, read-only mode,
 * onChange callback, FR-017 (empty select options skipped), FR-004 (reset on prop change).
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DynamicFieldSection from '@/components/ideas/dynamic-field-section'
import type { FieldDefinition } from '@/types/field-template'

// ─── Fixture field definitions ────────────────────────────────────────────────

const textField: FieldDefinition = {
  id: 'target_market',
  label: 'Target market or audience',
  type: 'text',
  required: true,
}

const textareaField: FieldDefinition = {
  id: 'current_process',
  label: 'Describe the current process',
  type: 'textarea',
  required: true,
}

const numberField: FieldDefinition = {
  id: 'time_saved',
  label: 'Estimated time saved (hours/week)',
  type: 'number',
  required: false,
}

const selectField: FieldDefinition = {
  id: 'pain_level',
  label: 'Current pain level',
  type: 'select',
  required: true,
  options: ['Low', 'Medium', 'High', 'Critical'],
}

const emptySelectField: FieldDefinition = {
  id: 'empty_select',
  label: 'Empty select',
  type: 'select',
  required: false,
  options: [],
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('DynamicFieldSection', () => {
  describe('null / empty fields', () => {
    it('renders nothing when fields is null', () => {
      const { container } = render(
        <DynamicFieldSection fields={null} values={{}} onChange={vi.fn()} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when fields is an empty array', () => {
      const { container } = render(
        <DynamicFieldSection fields={[]} values={{}} onChange={vi.fn()} />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('interactive mode — field type rendering', () => {
    it('renders a text <input> for type=text', () => {
      render(<DynamicFieldSection fields={[textField]} values={{}} onChange={vi.fn()} />)
      const input = screen.getByRole('textbox', { name: /target market or audience/i })
      expect(input.tagName).toBe('INPUT')
      expect(input).toHaveAttribute('type', 'text')
    })

    it('renders a <textarea> for type=textarea', () => {
      render(<DynamicFieldSection fields={[textareaField]} values={{}} onChange={vi.fn()} />)
      const textarea = screen.getByRole('textbox', { name: /describe the current process/i })
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('renders type="text" inputMode="numeric" for type=number (FR-006)', () => {
      render(<DynamicFieldSection fields={[numberField]} values={{}} onChange={vi.fn()} />)
      const input = screen.getByRole('textbox', { name: /estimated time saved/i })
      expect(input).toHaveAttribute('type', 'text')
      expect(input).toHaveAttribute('inputmode', 'numeric')
    })

    it('renders a <select> for type=select with options', () => {
      render(<DynamicFieldSection fields={[selectField]} values={{}} onChange={vi.fn()} />)
      const sel = screen.getByRole('combobox', { name: /current pain level/i })
      expect(sel.tagName).toBe('SELECT')
      expect(screen.getByRole('option', { name: 'Low' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Critical' })).toBeInTheDocument()
    })

    it('skips select fields with empty options (FR-017)', () => {
      render(<DynamicFieldSection fields={[emptySelectField]} values={{}} onChange={vi.fn()} />)
      expect(screen.queryByLabelText(/empty select/i)).toBeNull()
    })
  })

  describe('WCAG 2.1 AA — ARIA attributes (FR-015)', () => {
    it('sets aria-required on required fields', () => {
      render(<DynamicFieldSection fields={[textField]} values={{}} onChange={vi.fn()} />)
      const input = screen.getByRole('textbox', { name: /target market/i })
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('does not set aria-required on optional fields', () => {
      render(<DynamicFieldSection fields={[numberField]} values={{}} onChange={vi.fn()} />)
      const input = screen.getByRole('textbox', { name: /estimated time saved/i })
      expect(input).toHaveAttribute('aria-required', 'false')
    })

    it('sets aria-invalid and aria-describedby when error present', () => {
      render(
        <DynamicFieldSection
          fields={[textField]}
          values={{}}
          onChange={vi.fn()}
          errors={{ target_market: 'Target market or audience is required.' }}
        />
      )
      const input = screen.getByRole('textbox', { name: /target market/i })
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby', 'dynamic-target_market-error')
    })

    it('shows error message text', () => {
      render(
        <DynamicFieldSection
          fields={[textField]}
          values={{}}
          onChange={vi.fn()}
          errors={{ target_market: 'Target market or audience is required.' }}
        />
      )
      expect(screen.getByText('Target market or audience is required.')).toBeInTheDocument()
    })

    it('does not set aria-invalid when no error', () => {
      render(<DynamicFieldSection fields={[textField]} values={{}} onChange={vi.fn()} />)
      const input = screen.getByRole('textbox', { name: /target market/i })
      expect(input).toHaveAttribute('aria-invalid', 'false')
    })
  })

  describe('onChange callback', () => {
    it('calls onChange with updated value map on text input change', () => {
      const onChange = vi.fn()
      render(<DynamicFieldSection fields={[textField]} values={{}} onChange={onChange} />)
      const input = screen.getByRole('textbox', { name: /target market/i })
      fireEvent.change(input, { target: { value: 'Enterprise teams' } })
      expect(onChange).toHaveBeenCalledWith({ target_market: 'Enterprise teams' })
    })

    it('calls onChange with full map when multiple fields present', () => {
      const onChange = vi.fn()
      const existingValues = { current_process: 'Manual invoicing' }
      render(
        <DynamicFieldSection
          fields={[textareaField, textField]}
          values={existingValues}
          onChange={onChange}
        />
      )
      const textInput = screen.getByRole('textbox', { name: /target market/i })
      fireEvent.change(textInput, { target: { value: 'Startups' } })
      expect(onChange).toHaveBeenCalledWith({
        current_process: 'Manual invoicing',
        target_market: 'Startups',
      })
    })
  })

  describe('read-only mode (FR-008)', () => {
    it('renders labels and values as text — no inputs', () => {
      render(
        <DynamicFieldSection
          fields={[textField]}
          values={{ target_market: 'Startups' }}
          onChange={vi.fn()}
          readOnly
        />
      )
      expect(screen.queryByRole('textbox')).toBeNull()
      expect(screen.getByText('Target market or audience')).toBeInTheDocument()
      expect(screen.getByText('Startups')).toBeInTheDocument()
    })

    it('renders "Additional Details" heading in read-only mode', () => {
      render(
        <DynamicFieldSection
          fields={[textField]}
          values={{ target_market: 'SMBs' }}
          onChange={vi.fn()}
          readOnly
        />
      )
      expect(screen.getByText('Additional Details')).toBeInTheDocument()
    })

    it('does not render a field row when value is absent in read-only mode', () => {
      render(
        <DynamicFieldSection
          fields={[textField, textareaField]}
          values={{ current_process: 'Some process' }}
          onChange={vi.fn()}
          readOnly
        />
      )
      // target_market has no value — not rendered
      expect(screen.queryByText('Target market or audience')).toBeNull()
      // current_process is rendered
      expect(screen.getByText('Describe the current process')).toBeInTheDocument()
    })
  })

  describe('FR-004 — reset on fields prop change', () => {
    it('reflects new values prop when parent resets after category switch', () => {
      const { rerender } = render(
        <DynamicFieldSection
          fields={[textField]}
          values={{ target_market: 'Old value' }}
          onChange={vi.fn()}
        />
      )
      const input = screen.getByRole('textbox', { name: /target market/i })
      expect(input).toHaveValue('Old value')

      // Simulate parent resetting values on category switch (FR-004)
      rerender(<DynamicFieldSection fields={[textareaField]} values={{}} onChange={vi.fn()} />)
      // Old field gone; old value reset
      expect(screen.queryByRole('textbox', { name: /target market/i })).toBeNull()
      const textarea = screen.getByRole('textbox', { name: /describe the current process/i })
      expect(textarea).toHaveValue('')
    })
  })
})
