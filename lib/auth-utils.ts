import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

/**
 * Hash a plaintext password using bcryptjs (12 salt rounds).
 * Safe to call in Node.js runtime only — never in Edge runtime.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

/**
 * Compare a plaintext password against a bcrypt hash.
 * Returns true if the password matches.
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/**
 * Generate a cryptographically secure 64-character hex token.
 * Used for email verification links (stored in VerificationToken.token).
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex')
}
