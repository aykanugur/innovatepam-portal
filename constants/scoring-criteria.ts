/**
 * EPIC-V2-06 — Scoring System
 * US-040: Fixed scoring criteria constants.
 *
 * 5 predefined evaluation dimensions that reviewers can tag when scoring.
 * Stored as a config constant — not a DB model — because the criteria
 * are a UX constant, not domain data that needs independent lifecycle management.
 */

export const SCORING_CRITERIA = [
  'Technical Feasibility',
  'Strategic Alignment',
  'Cost Efficiency',
  'Employee Impact',
  'Innovation Level',
] as const

export type ScoringCriterion = (typeof SCORING_CRITERIA)[number]
