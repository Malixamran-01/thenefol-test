// Single source of truth for customer token signing / verification.
import { Request } from 'express'
import jwt from 'jsonwebtoken'

const FALLBACK_JWT_SECRET = 'your-secret-key'

export const JWT_SECRET = process.env.JWT_SECRET || FALLBACK_JWT_SECRET

if (!process.env.JWT_SECRET) {
  console.warn(
    '⚠️  [auth] JWT_SECRET is not set — customer tokens are signed with an insecure default. ' +
      'Set JWT_SECRET in the backend environment (all customers will need to sign in again once).'
  )
}

/**
 * Old `user_token_{id}_{ts}` tokens are unsigned, so anyone can forge them.
 * They are rejected unless ALLOW_LEGACY_USER_TOKENS=1 (temporary escape hatch only).
 */
export function legacyUserTokensAllowed(): boolean {
  return process.env.ALLOW_LEGACY_USER_TOKENS === '1'
}

export function signUserToken(user: { id: number | string; email?: string | null; unique_user_id?: string | null }): string {
  return jwt.sign(
    { userId: user.id, email: user.email ?? null, user_id: user.unique_user_id ?? null },
    JWT_SECRET,
    { expiresIn: '30d' }
  )
}

export function extractBearerToken(req: Request): string | null {
  const raw = req.headers.authorization
  if (!raw) return null
  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim()
  return token || null
}

/** Returns the customer user id for a valid customer token, otherwise null. Staff tokens return null. */
export function verifyUserToken(token: string | null | undefined): string | null {
  if (!token || token.startsWith('staff_')) return null

  if (/^[^\s.]+\.[^\s.]+\.[^\s.]+$/.test(token)) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string | number }
      return decoded?.userId != null && String(decoded.userId).trim() !== '' ? String(decoded.userId) : null
    } catch {
      return null
    }
  }

  if (legacyUserTokensAllowed()) {
    const parts = token.split('_')
    if (parts.length >= 3 && parts[0] === 'user' && parts[1] === 'token' && /^\d+$/.test(parts[2])) {
      return parts[2]
    }
  }

  return null
}

/** Optional auth: customer user id from the Authorization header, or null. */
export function getUserIdFromRequest(req: Request): string | null {
  return verifyUserToken(extractBearerToken(req))
}
