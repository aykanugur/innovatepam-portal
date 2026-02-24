import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type RateLimitResult = {
  success: boolean
  remaining: number
  reset: number
}

type RateLimiterLike = {
  limit(identifier: string): Promise<RateLimitResult>
}

/**
 * Create an in-memory rate limiter as a fallback when Upstash Redis is not
 * configured. Process-scoped — does NOT work across multiple instances.
 * Suitable for local dev and single-instance alpha deployments.
 */
function createInMemoryLimiter(): RateLimiterLike {
  const store = new Map<string, { count: number; reset: number }>()
  const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
  const LIMIT = 5

  return {
    async limit(identifier: string): Promise<RateLimitResult> {
      const now = Date.now()
      const record = store.get(identifier)

      if (!record || record.reset < now) {
        store.set(identifier, { count: 1, reset: now + WINDOW_MS })
        return { success: true, remaining: LIMIT - 1, reset: now + WINDOW_MS }
      }

      record.count++
      if (record.count > LIMIT) {
        return { success: false, remaining: 0, reset: record.reset }
      }

      return {
        success: true,
        remaining: LIMIT - record.count,
        reset: record.reset,
      }
    },
  }
}

/**
 * Login rate limiter: 5 attempts per email address per 15-minute sliding window.
 * Key = normalized (lowercase) email address — FR-018.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL is configured,
 * falls back to an in-memory Map otherwise.
 */
function createLoginRateLimiter(): RateLimiterLike {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (url && token) {
    const redis = new Redis({ url, token })
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      prefix: 'innovatepam:login',
    })

    return {
      async limit(identifier: string) {
        const result = await limiter.limit(identifier.toLowerCase())
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
        }
      },
    }
  }

  return createInMemoryLimiter()
}

export const loginRateLimiter = createLoginRateLimiter()

// ─── Idea submission rate limiter ─────────────────────────────────────────────
/**
 * T008 — Idea submission rate limiter: 1 submission per userId per 60-second
 * sliding window. FR-029 / R-003.
 * Key = authenticated user's cuid (from session.userId).
 * Uses Upstash Redis when configured; falls back to in-memory Map otherwise.
 */
function createIdeaSubmitRateLimiter(): RateLimiterLike {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (url && token) {
    const redis = new Redis({ url, token })
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, '60 s'),
      prefix: 'innovatepam:idea-submit',
    })

    return {
      async limit(identifier: string) {
        const result = await limiter.limit(identifier)
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
        }
      },
    }
  }

  // In-memory fallback: 1 submission per 60-second window
  const store = new Map<string, { count: number; reset: number }>()
  const WINDOW_MS = 60 * 1000

  return {
    async limit(identifier: string): Promise<RateLimitResult> {
      const now = Date.now()
      const record = store.get(identifier)

      if (!record || record.reset < now) {
        store.set(identifier, { count: 1, reset: now + WINDOW_MS })
        return { success: true, remaining: 0, reset: now + WINDOW_MS }
      }

      record.count++
      if (record.count > 1) {
        return { success: false, remaining: 0, reset: record.reset }
      }

      return { success: true, remaining: 0, reset: record.reset }
    },
  }
}

export const ideaSubmitRateLimiter = createIdeaSubmitRateLimiter()
