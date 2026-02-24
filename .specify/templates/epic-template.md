# Epic: [EPIC NAME]

**Epic ID**: EPIC-[###]  
**Owner**: [Name / Role]  
**Created**: [DATE]  
**Last Updated**: [DATE]  
**Status**: Draft | Refined | In Progress | Done | Cancelled  
**Target Release**: [Version / Quarter / Sprint range]  
**PRD Reference**: [Link to PRD if applicable]  

---

## 1. Summary

<!--
  1-2 sentences: What capability does this epic deliver and why does it matter?
  Should be understandable by any stakeholder without further context.
-->

[High-level description of the epic and its business value.]

---

## 2. Business Context

### 2.1 Strategic Alignment
- **Company Goal**: [Which OKR / strategic pillar does this support?]
- **Product Vision Fit**: [How does this move the product closer to its vision?]

### 2.2 Business Value
| Value Driver | Description | Estimated Impact |
|-------------|-------------|-----------------|
| [e.g., Revenue] | [How it drives revenue] | [e.g., +15% conversion] |
| [e.g., Retention] | [How it improves retention] | [e.g., -20% churn] |
| [e.g., Efficiency] | [Internal process improvement] | [e.g., 5h/week saved] |

### 2.3 Cost of Delay
[What happens if we don't build this? Competitive risk, user attrition, compliance deadline, etc.]

---

## 3. Scope

### 3.1 In Scope
- [Capability / behavior that IS included]
- [Another included item]
- [Another included item]

### 3.2 Out of Scope
- [Explicitly excluded item and why]
- [Another exclusion]

### 3.3 Assumptions
- [Key assumption that must hold true for this epic to succeed]
- [Another assumption]

---

## 4. User Personas

<!--
  Which personas does this epic primarily serve?
  Reference existing persona docs or summarize inline.
-->

| Persona | Role / Description | Primary Need |
|---------|-------------------|-------------|
| [Persona name] | [Brief description] | [What they need from this epic] |
| [Persona name] | [Brief description] | [What they need] |

---

## 5. Feature Breakdown

<!--
  Decompose the epic into features (large) or user stories (small).
  Each feature should be estimable and deliverable within 1-3 sprints.
  Use MoSCoW: Must / Should / Could / Won't (this time).
-->

### Feature 1: [Feature Name] — Must Have
**Description**: [What this feature does]  
**User Stories**:
- [ ] US-01: As a [persona], I want to [action], so that [outcome]
- [ ] US-02: As a [persona], I want to [action], so that [outcome]

**Acceptance Criteria**:
1. [Criterion]
2. [Criterion]

**Estimated Effort**: [T-shirt size: XS / S / M / L / XL]

---

### Feature 2: [Feature Name] — Must Have
**Description**: [What this feature does]  
**User Stories**:
- [ ] US-03: As a [persona], I want to [action], so that [outcome]
- [ ] US-04: As a [persona], I want to [action], so that [outcome]

**Acceptance Criteria**:
1. [Criterion]

**Estimated Effort**: [T-shirt size]

---

### Feature 3: [Feature Name] — Should Have
**Description**: [What this feature does]  
**User Stories**:
- [ ] US-05: As a [persona], I want to [action], so that [outcome]

**Acceptance Criteria**:
1. [Criterion]

**Estimated Effort**: [T-shirt size]

---

### Feature 4: [Feature Name] — Could Have
**Description**: [What this feature does]  
**User Stories**:
- [ ] US-06: As a [persona], I want to [action], so that [outcome]

**Estimated Effort**: [T-shirt size]

---

## 6. Dependencies

<!--
  Map what this epic depends on and what depends on it.
-->

### 6.1 Blocked By (Upstream)
| Dependency | Type | Owner | Status | Risk |
|-----------|------|-------|--------|------|
| [e.g., Auth service v2 migration] | Internal | [Team] | In Progress | Med |
| [e.g., Third-party API access] | External | [Vendor] | Pending | High |

### 6.2 Blocking (Downstream)
| Dependent | Type | Impact if Delayed |
|----------|------|------------------|
| [e.g., Mobile app release] | Internal | [Delays mobile launch by ~2 weeks] |

---

## 7. UX / Design

<!--
  Link design artifacts or describe the expected user experience.
-->

- **Design Status**: Not Started | In Progress | Ready | N/A
- **Figma / Wireframes**: [Link]
- **Key UX Flows**: [List or link to flow diagrams]
- **Design Principles**: [e.g., "Minimal friction", "Progressive disclosure"]

---

## 8. Technical Notes

<!--
  Lightweight technical considerations — just enough for engineers to assess scope.
  Detailed architecture belongs in a separate tech design doc.
-->

- [e.g., "New API endpoints under /api/v2/billing"]
- [e.g., "Requires DB schema migration — add `subscription_tier` column"]
- [e.g., "Feature-flagged behind `enable_billing_v2`"]
- **Tech Design Doc**: [Link if exists]

---

## 9. Milestones & Timeline

<!--
  Break the epic into delivery milestones.
  Each milestone should be demo-able and provide incremental value.
-->

| Milestone | Features Included | Target Date | Exit Criteria |
|-----------|------------------|-------------|---------------|
| M1 — Foundation | Feature 1 | [Date / Sprint] | [e.g., Core CRUD works E2E] |
| M2 — Core Experience | Features 1 + 2 | [Date / Sprint] | [e.g., Happy path complete] |
| M3 — Polish & Edge Cases | Features 1-3 | [Date / Sprint] | [e.g., All P1 bugs resolved] |
| M4 — Full Scope | All features | [Date / Sprint] | [e.g., Metrics targets met] |

---

## 10. Success Metrics

| Metric | Baseline | Target | Measurement Method | Review Date |
|--------|----------|--------|--------------------|-------------|
| [e.g., Task completion rate] | [Current %] | [Target %] | [e.g., Analytics event] | [Date] |
| [e.g., Time to complete flow] | [Current] | [Target] | [e.g., Session recording] | [Date] |
| [e.g., NPS delta] | [Current] | [Target] | [e.g., In-app survey] | [Date] |

---

## 11. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|------|-----------|--------|------------|-------|
| 1 | [Risk description] | High / Med / Low | High / Med / Low | [Plan] | [Who] |
| 2 | [Risk description] | [Likelihood] | [Impact] | [Plan] | [Who] |

---

## 12. Stakeholders & Communication

| Stakeholder | Role | Interest | Communication Cadence |
|------------|------|----------|----------------------|
| [Name] | Product Owner | Decision-maker | Weekly sync |
| [Name] | Engineering Lead | Execution | Daily standup |
| [Name] | Design Lead | UX quality | Bi-weekly review |
| [Name] | QA Lead | Quality assurance | Per-milestone sign-off |

---

## 13. Open Questions

| # | Question | Owner | Status | Resolution |
|---|---------|-------|--------|------------|
| 1 | [Unresolved question] | [Who decides] | Open | — |
| 2 | [Unresolved question] | [Who decides] | Open | — |

---

## 14. Related Artifacts

- **PRD**: [Link]
- **Tech Design**: [Link]
- **Spec(s)**: [Link to specs/ files]
- **Competitor Analysis**: [Link]
- **User Research**: [Link]

---

## Appendix: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | [DATE] | [Author] | Initial draft |
