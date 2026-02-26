'use server'

/**
 * lib/actions/scoring-analytics.ts
 *
 * EPIC-V2-06 — Scoring System
 * US-044: Server-side data fetching functions for scoring analytics widgets.
 *
 * Three focused queries:
 * 1. getAvgScoreByCategory — average score per idea category
 * 2. getScoreDistribution — count of ideas per score value (1–5)
 * 3. getTopScoredIdeas — top 5 accepted ideas by score
 */

import { db } from '@/lib/db'
import { CATEGORY_LABEL, type CategorySlug } from '@/constants/categories'
import { maskAuthorIfBlind } from '@/lib/blind-review'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AvgScoreByCategory {
  category: string
  categoryLabel: string
  avg: number
}

export interface ScoreDistributionBucket {
  score: number
  count: number
}

export interface TopScoredIdea {
  ideaId: string
  title: string
  category: string
  score: number
  authorName: string
}

// ── getAvgScoreByCategory ─────────────────────────────────────────────────────

export async function getAvgScoreByCategory(): Promise<AvgScoreByCategory[]> {
  const scores = await db.ideaScore.findMany({
    include: {
      idea: { select: { category: true } },
    },
  })

  // Group by category and compute average
  const categoryMap = new Map<string, { total: number; count: number }>()
  for (const s of scores) {
    const cat = s.idea.category ?? 'unknown'
    const entry = categoryMap.get(cat) ?? { total: 0, count: 0 }
    entry.total += s.score
    entry.count += 1
    categoryMap.set(cat, entry)
  }

  return Array.from(categoryMap.entries()).map(([category, { total, count }]) => ({
    category,
    categoryLabel: CATEGORY_LABEL[category as CategorySlug] ?? category,
    avg: Math.round((total / count) * 10) / 10,
  }))
}

// ── getScoreDistribution ──────────────────────────────────────────────────────

export async function getScoreDistribution(): Promise<ScoreDistributionBucket[]> {
  const groups = await db.ideaScore.groupBy({
    by: ['score'],
    _count: { score: true },
  })

  // Build all 5 buckets (1-5), filling missing with 0
  const countMap = new Map(groups.map((g) => [g.score, g._count.score]))
  return [1, 2, 3, 4, 5].map((score) => ({
    score,
    count: countMap.get(score) ?? 0,
  }))
}

// ── getTopScoredIdeas ─────────────────────────────────────────────────────────

export async function getTopScoredIdeas(
  requesterId: string,
  requesterRole: string,
  featureBlindReviewEnabled: boolean,
  limit = 5
): Promise<TopScoredIdea[]> {
  const scores = await db.ideaScore.findMany({
    where: { idea: { status: 'ACCEPTED' } },
    orderBy: [{ score: 'desc' }, { recordedAt: 'asc' }],
    take: limit,
    include: {
      idea: {
        select: {
          id: true,
          title: true,
          category: true,
          authorId: true,
          status: true,
          author: { select: { displayName: true } },
        },
      },
    },
  })

  // Apply blind review masking for each idea
  return scores.map((s) => {
    // Look up pipeline blind review status asynchronously is complex;
    // for analytics, we use a simplified check — blind review only
    // applies during UNDER_REVIEW, so ACCEPTED ideas are never masked.
    const authorName = maskAuthorIfBlind({
      authorId: s.idea.authorId,
      authorDisplayName: s.idea.author.displayName,
      requesterId,
      requesterRole,
      pipelineBlindReview: false, // ACCEPTED ideas are post-decision; never masked
      ideaStatus: s.idea.status,
      featureFlagEnabled: featureBlindReviewEnabled,
    })

    return {
      ideaId: s.idea.id,
      title: s.idea.title ?? 'Untitled',
      category: CATEGORY_LABEL[s.idea.category as CategorySlug] ?? s.idea.category ?? 'Unknown',
      score: s.score,
      authorName,
    }
  })
}
