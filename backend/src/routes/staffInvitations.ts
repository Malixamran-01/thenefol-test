import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'
import { hashPassword } from '../utils/staffPassword'
import { sendStaffAdminInvitationEmail } from '../services/emailService'
import { generateInviteToken, getAdminPanelOrigin, INVITATION_EXPIRY_HOURS } from '../config/superAdmin'
import type { StaffContext } from './staff'

export async function inviteStaff(pool: Pool, req: Request, res: Response) {
  try {
    const ctx = (req as any).staffContext as StaffContext | undefined
    if (!ctx) return sendError(res, 401, 'Unauthorized')

    const { email, roleId } = req.body || {}
    const validationError = validateRequired({ email }, ['email'])
    if (validationError) return sendError(res, 400, validationError)

    const normalized = String(email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return sendError(res, 400, 'Valid email required')
    }

    const { rows: existing } = await pool.query(
      `SELECT id, password FROM staff_users WHERE lower(email) = lower($1)`,
      [normalized]
    )
    if (existing.length > 0 && existing[0].password) {
      return sendError(res, 409, 'A staff account with this email already exists')
    }

    const token = generateInviteToken()
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 3600 * 1000)

    await pool.query('BEGIN')
    await pool.query(
      `INSERT INTO staff_invitations (email, token, invited_by, role_id, expires_at)
       VALUES (lower($1), $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         token = EXCLUDED.token,
         invited_by = EXCLUDED.invited_by,
         role_id = EXCLUDED.role_id,
         expires_at = EXCLUDED.expires_at,
         accepted_at = NULL`,
      [normalized, token, ctx.staffId, roleId ?? null, expiresAt]
    )

    const inviteUrl = `${getAdminPanelOrigin()}/admin/accept-invite?token=${encodeURIComponent(token)}`
    try {
      await sendStaffAdminInvitationEmail({
        to: normalized,
        inviteUrl,
        expiresInHours: INVITATION_EXPIRY_HOURS,
      })
    } catch (mailErr) {
      await pool.query('ROLLBACK')
      throw mailErr
    }
    await pool.query('COMMIT')

    sendSuccess(res, { message: `Invitation sent to ${normalized}` })
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {})
    console.error('inviteStaff error:', err)
    sendError(res, 500, 'Failed to send invitation', err)
  }
}

export async function acceptInvitation(pool: Pool, req: Request, res: Response) {
  try {
    const { token, name, password } = req.body || {}
    const validationError = validateRequired({ token, name, password }, ['token', 'name', 'password'])
    if (validationError) return sendError(res, 400, validationError)

    if (String(password).length < 8) {
      return sendError(res, 400, 'Password must be at least 8 characters')
    }

    await pool.query('BEGIN')
    const { rows: invRows } = await pool.query(
      `SELECT * FROM staff_invitations
       WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW() FOR UPDATE`,
      [token]
    )

    if (invRows.length === 0) {
      await pool.query('ROLLBACK')
      return sendError(res, 400, 'Invalid or expired invitation token')
    }

    const invitation = invRows[0]

    const { rows: dupe } = await pool.query(
      `SELECT id, password FROM staff_users WHERE lower(email) = lower($1)`,
      [invitation.email]
    )
    if (dupe.length > 0 && dupe[0].password) {
      await pool.query('ROLLBACK')
      return sendError(res, 409, 'A staff account with this email already exists')
    }

    const hashed = hashPassword(String(password))

    const { rows: userRows } = await pool.query(
      `INSERT INTO staff_users (email, name, password, is_active, invited_by, invitation_accepted_at, created_at, updated_at)
       VALUES (lower($1), $2, $3, TRUE, $4, NOW(), NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password = EXCLUDED.password,
         is_active = TRUE,
         invited_by = EXCLUDED.invited_by,
         invitation_accepted_at = NOW(),
         updated_at = NOW()
       RETURNING id`,
      [invitation.email, String(name).trim(), hashed, invitation.invited_by]
    )

    const staffId = userRows[0].id

    if (invitation.role_id) {
      await pool.query(
        `INSERT INTO staff_roles (staff_id, role_id) VALUES ($1, $2)
         ON CONFLICT (staff_id, role_id) DO NOTHING`,
        [staffId, invitation.role_id]
      )
    }

    await pool.query(`UPDATE staff_invitations SET accepted_at = NOW() WHERE id = $1`, [invitation.id])
    await pool.query('COMMIT')

    sendSuccess(res, { message: 'Account created. You can now log in.' })
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {})
    console.error('acceptInvitation error:', err)
    sendError(res, 500, 'Failed to accept invitation', err)
  }
}

export async function listInvitations(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.email, i.expires_at, i.accepted_at, i.created_at,
              s.name AS invited_by_name,
              r.name AS pre_assigned_role
       FROM staff_invitations i
       LEFT JOIN staff_users s ON s.id = i.invited_by
       LEFT JOIN roles r ON r.id = i.role_id
       ORDER BY i.created_at DESC`
    )
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list invitations', err)
  }
}

export async function revokeInvitation(pool: Pool, req: Request, res: Response) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return sendError(res, 400, 'Invalid invitation id')

    await pool.query(`DELETE FROM staff_invitations WHERE id = $1 AND accepted_at IS NULL`, [id])
    sendSuccess(res, { message: 'Invitation revoked' })
  } catch (err) {
    sendError(res, 500, 'Failed to revoke invitation', err)
  }
}
