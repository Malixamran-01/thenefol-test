import { Request, Response, NextFunction } from 'express'
import { Pool } from 'pg'

/** Same token shape as `authenticateToken` in apiHelpers */
function parseUserIdFromAuthHeader(req: Request): string | null {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  const tokenParts = token.split('_')
  if (tokenParts.length < 3 || tokenParts[0] !== 'user' || tokenParts[1] !== 'token') return null
  return tokenParts[2]
}

/**
 * Blocks API access for users whose author_profiles.status is `banned`.
 * Apply to /api/blog, /api/collab, and /api/authors (Nefol Social + creator flows).
 * Unauthenticated requests pass through. Admin/staff header bypass matches authenticateToken.
 */
export function nefolSocialBanGuard(pool: Pool | null) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') return next()

    const role = req.headers['x-user-role'] as string | undefined
    const permissionsHeader = req.headers['x-user-permissions'] as string | undefined
    if (role && permissionsHeader) return next()

    const userIdStr = parseUserIdFromAuthHeader(req)
    if (!userIdStr || !pool) return next()

    const uid = parseInt(String(userIdStr), 10)
    if (!Number.isFinite(uid)) return next()

    try {
      const { rows } = await pool.query(
        `SELECT status, ban_public_message
         FROM author_profiles
         WHERE user_id = $1::integer AND status != 'deleted'
         ORDER BY id ASC
         LIMIT 1`,
        [uid]
      )
      const row = rows[0] as { status: string; ban_public_message: string | null } | undefined
      if (!row || row.status !== 'banned') return next()

      return res.status(403).json({
        code: 'AUTHOR_BANNED',
        message: 'Your access to Nefol Social has been restricted.',
        ban_public_message: row.ban_public_message ?? null,
      })
    } catch (e) {
      console.error('nefolSocialBanGuard', e)
      return next()
    }
  }
}
