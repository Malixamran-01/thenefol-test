import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'
import { hashPassword } from '../utils/staffPassword'
import { sendStaffAdminInvitationEmail } from '../services/emailService'
import { generateInviteToken, getAdminPanelOrigin, INVITATION_EXPIRY_HOURS } from '../config/superAdmin'
import { STAFF_TERMS_ACCEPTANCE_VERSION } from '../config/staffOnboarding'
import type { StaffContext } from './staff'

const DOB_RE = /^\d{4}-\d{2}-\d{2}$/

function parseOptionalDob(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  const s = String(value).trim()
  if (!DOB_RE.test(s)) return null
  const d = new Date(s + 'T12:00:00Z')
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  if (d.getTime() > now.getTime()) return null
  if (d.getFullYear() < 1900) return null
  return s
}

/** Public — validate token and show invited email for onboarding UX */
export async function getInviteStatus(pool: Pool, req: Request, res: Response) {
  try {
    const token = String((req.query || {}).token || '').trim()
    if (!token) return sendError(res, 400, 'token query required')

    const { rows } = await pool.query(
      `SELECT email FROM staff_invitations
       WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
      [token]
    )
    if (rows.length === 0) {
      return sendSuccess(res, { valid: false })
    }
    sendSuccess(res, { valid: true, email: rows[0].email })
  } catch (err) {
    sendError(res, 500, 'Failed to validate invitation', err)
  }
}

export async function inviteStaff(pool: Pool, req: Request, res: Response) {
  try {
    const ctx = (req as any).staffContext as StaffContext | undefined
    if (!ctx) return sendError(res, 401, 'Unauthorized')

    const { email } = req.body || {}
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
    // Roles are assigned later by admin/super admin — never store role_id on invite
    await pool.query(
      `INSERT INTO staff_invitations (email, token, invited_by, role_id, expires_at)
       VALUES (lower($1), $2, $3, NULL, $4)
       ON CONFLICT (email) DO UPDATE SET
         token = EXCLUDED.token,
         invited_by = EXCLUDED.invited_by,
         role_id = NULL,
         expires_at = EXCLUDED.expires_at,
         accepted_at = NULL`,
      [normalized, token, ctx.staffId, expiresAt]
    )

    const inviteUrl = `${getAdminPanelOrigin()}/admin/staff-onboarding?token=${encodeURIComponent(token)}`
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
    const {
      token,
      name,
      password,
      agreeToTerms,
      dateOfBirth,
      phone,
      jobTitle,
    } = req.body || {}

    const validationError = validateRequired({ token, name, password }, ['token', 'name', 'password'])
    if (validationError) return sendError(res, 400, validationError)

    if (agreeToTerms !== true) {
      return sendError(res, 400, 'You must accept the staff and admin access agreement')
    }

    if (String(password).length < 8) {
      return sendError(res, 400, 'Password must be at least 8 characters')
    }

    const dob = parseOptionalDob(dateOfBirth)
    if (!dob) {
      return sendError(res, 400, 'A valid date of birth (YYYY-MM-DD) is required')
    }

    const phoneNorm =
      phone === undefined || phone === null || String(phone).trim() === ''
        ? null
        : String(phone).trim().slice(0, 40)

    const jobNorm =
      jobTitle === undefined || jobTitle === null || String(jobTitle).trim() === ''
        ? null
        : String(jobTitle).trim().slice(0, 120)

    const displayName = String(name).trim()
    if (!displayName) {
      return sendError(res, 400, 'Name is required')
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
    const termsVer = STAFF_TERMS_ACCEPTANCE_VERSION

    const { rows: userRows } = await pool.query(
      `INSERT INTO staff_users (
         email, name, password, is_active, invited_by, invitation_accepted_at,
         phone, date_of_birth, job_title, terms_accepted_at, terms_accepted_version,
         created_at, updated_at
       )
       VALUES (
         lower($1), $2, $3, TRUE, $4, NOW(),
         $5, $6::date, $7, NOW(), $8,
         NOW(), NOW()
       )
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password = EXCLUDED.password,
         is_active = TRUE,
         invited_by = EXCLUDED.invited_by,
         invitation_accepted_at = NOW(),
         phone = EXCLUDED.phone,
         date_of_birth = EXCLUDED.date_of_birth,
         job_title = EXCLUDED.job_title,
         terms_accepted_at = NOW(),
         terms_accepted_version = EXCLUDED.terms_accepted_version,
         updated_at = NOW()
       RETURNING id`,
      [invitation.email, displayName, hashed, invitation.invited_by, phoneNorm, dob, jobNorm, termsVer]
    )

    await pool.query(`UPDATE staff_invitations SET accepted_at = NOW() WHERE id = $1`, [invitation.id])
    await pool.query('COMMIT')

    sendSuccess(res, {
      message: 'Account created. An administrator will assign your roles. You can sign in once roles are assigned.',
      staffId: userRows[0].id,
    })
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {})
    console.error('acceptInvitation error:', err)
    sendError(res, 500, 'Failed to complete onboarding', err)
  }
}

export async function listInvitations(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.email, i.expires_at, i.accepted_at, i.created_at,
              s.name AS invited_by_name
       FROM staff_invitations i
       LEFT JOIN staff_users s ON s.id = i.invited_by
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
