/**
 * T032 — Shared API error response helper.
 * Returns a typed NextResponse with a consistent { error, ...extras } body.
 * Used across all idea Route Handlers to ensure error shape uniformity.
 *
 * @param status  HTTP status code (400, 401, 403, 404, 413, 415, 429, 500)
 * @param message Human-readable error message (mapped to "error" key)
 * @param extras  Optional additional fields merged into the response body
 */
import { NextResponse } from 'next/server'

export function apiError(
  status: number,
  message: string,
  extras?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error: message, ...extras }, { status })
}
