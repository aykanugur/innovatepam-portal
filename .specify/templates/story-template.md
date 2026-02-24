# User Story: [STORY TITLE]

**Story ID**: US-[###]  
**Epic**: [Epic name / EPIC-###]  
**Author**: [Name / Role]  
**Created**: [DATE]  
**Last Updated**: [DATE]  
**Status**: Draft | Ready | In Progress | In Review | Done  
**Priority**: P1 (Must) | P2 (Should) | P3 (Could)  
**Estimate**: [Story points or T-shirt size: XS / S / M / L / XL]  
**Sprint**: [Sprint number or "Backlog"]  
**Assignee**: [Name or Unassigned]  

---

## Story Statement

**As a** [persona / user role],  
**I want to** [action / capability],  
**so that** [benefit / outcome].

---

## Context & Motivation

<!--
  Why does this story exist? Link it to the bigger picture.
  1-3 sentences connecting this to user pain, business goal, or epic objective.
-->

[Why this matters. What user problem or business need does it address?]

---

## Acceptance Criteria

<!--
  Use Given/When/Then format for testable criteria.
  Each criterion should be independently verifiable.
  Number them for easy reference in code reviews and QA.
-->

1. **Given** [precondition / initial state],  
   **When** [user action or system event],  
   **Then** [expected outcome].

2. **Given** [precondition],  
   **When** [action],  
   **Then** [outcome].

3. **Given** [precondition],  
   **When** [action],  
   **Then** [outcome].

---

## Edge Cases & Negative Scenarios

<!--
  What should happen when things go wrong or inputs are unexpected?
-->

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | [e.g., User submits empty form] | [e.g., Inline validation errors shown] |
| 2 | [e.g., Network timeout during save] | [e.g., Retry with toast notification] |
| 3 | [e.g., Unauthorized access attempt] | [e.g., Redirect to login] |

---

## UI / UX Notes

<!--
  Visual guidance for implementation. Link mockups or describe the interaction.
  Remove this section if the story is backend-only.
-->

- **Mockup / Wireframe**: [Link to Figma / screenshot]
- **Interaction Notes**: [e.g., "Form auto-saves on blur", "Optimistic UI update"]
- **Responsive Behavior**: [e.g., "Stacks vertically below 768px"]
- **Accessibility**: [e.g., "All form fields must have labels", "Keyboard navigable"]

---

## Technical Notes

<!--
  Implementation hints — not a full design doc, just enough for the developer to start.
  Remove if not applicable.
-->

- [e.g., "Add `PUT /api/v2/users/:id/preferences` endpoint"]
- [e.g., "Reuse existing `PreferenceForm` component"]
- [e.g., "Requires migration: add `notification_channel` column to `user_settings`"]
- **Feature Flag**: [e.g., "`enable_notification_prefs`" or "None"]

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| [e.g., Design mockup for settings page] | Design | Done | No |
| [e.g., US-042 — Auth token refresh] | Story | In Progress | Yes |
| [e.g., Third-party notification API] | External | Available | No |

---

## Test Plan

<!--
  How will this story be verified? Outline the testing approach.
-->

### Manual Testing
- [ ] [Test case: e.g., "Submit form with valid data → success toast appears"]
- [ ] [Test case: e.g., "Submit form with missing required field → error shown"]
- [ ] [Test case: e.g., "Verify mobile layout at 375px width"]

### Automated Testing
- [ ] Unit test: [e.g., "Validation logic for preference schema"]
- [ ] Integration test: [e.g., "API endpoint returns 200 with valid payload"]
- [ ] E2E test: [e.g., "Full save flow from UI to DB verification"]

---

## Definition of Done

<!--
  Checklist — all items must be true before marking the story as Done.
  Customize per team norms.
-->

- [ ] All acceptance criteria met
- [ ] Edge cases handled
- [ ] Unit tests written and passing
- [ ] Integration / E2E tests passing (if applicable)
- [ ] Code reviewed and approved
- [ ] No regressions in CI pipeline
- [ ] Documentation updated (if applicable)
- [ ] Accessibility validated
- [ ] Product Owner sign-off

---

## Open Questions

| # | Question | Owner | Status | Resolution |
|---|---------|-------|--------|------------|
| 1 | [Question] | [Who] | Open | — |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | [DATE] | [Author] | Initial draft |
