import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'
import crypto from 'crypto'

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(stored: string, plain: string): boolean {
  try {
    if (!stored?.includes(':')) return false
    const [salt, originalHash] = stored.split(':')
    const hashed = crypto.scryptSync(plain, salt, 64).toString('hex')
    const originalBuffer = Buffer.from(originalHash, 'hex')
    const hashedBuffer = Buffer.from(hashed, 'hex')
    if (originalBuffer.length !== hashedBuffer.length) return false
    return crypto.timingSafeEqual(originalBuffer, hashedBuffer)
  } catch {
    return false
  }
}

function toStringArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string')
      }
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean)
    }
  }
  return []
}

const SESSION_TTL_HOURS = Number(process.env.STAFF_SESSION_TTL_HOURS || 12)

type StaffAggregatedRow = {
  id: number
  name: string
  email: string
  password: string
  is_active: boolean
  roles: string[] | string | null
  permissions: string[] | string | null
}

export type StaffContext = {
  staffId: number
  sessionId: number
  token: string
  name: string
  email: string
  roles: string[]
  permissions: string[]
  primaryRole: string
}

async function fetchStaffWithAccess(pool: Pool, field: 'email' | 'id', value: string | number): Promise<StaffAggregatedRow | null> {
  const whereClause = field === 'email' ? 'lower(su.email) = lower($1)' : 'su.id = $1'
  const { rows } = await pool.query(
    `
      select
        su.*,
        coalesce(json_agg(distinct r.name) filter (where r.id is not null), '[]'::json) as roles,
        coalesce(json_agg(distinct p.code) filter (where p.id is not null), '[]'::json) as permissions
      from staff_users su
      left join staff_roles sr on sr.staff_id = su.id
      left join roles r on r.id = sr.role_id
      left join role_permissions rp on rp.role_id = r.id
      left join permissions p on p.id = rp.permission_id
      where ${whereClause}
      group by su.id
    `,
    [value]
  )
  return rows[0] || null
}

function toStaffResponse(row: StaffAggregatedRow) {
  const roles = toStringArray(row.roles) || []
  const permissions = toStringArray(row.permissions) || []
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: roles[0] || 'admin',
    roles,
    permissions
  }
}

export async function getStaffContextByToken(pool: Pool, token: string): Promise<StaffContext | null> {
  const { rows } = await pool.query(
    `
      select
        ss.id as session_id,
        ss.token,
        ss.staff_id,
        ss.expires_at,
        ss.revoked_at,
        su.name,
        su.email,
        su.is_active,
        coalesce(json_agg(distinct r.name) filter (where r.id is not null), '[]'::json) as roles,
        coalesce(json_agg(distinct p.code) filter (where p.id is not null), '[]'::json) as permissions
      from staff_sessions ss
      inner join staff_users su on su.id = ss.staff_id
      left join staff_roles sr on sr.staff_id = su.id
      left join roles r on r.id = sr.role_id
      left join role_permissions rp on rp.role_id = r.id
      left join permissions p on p.id = rp.permission_id
      where ss.token = $1
      group by ss.id, su.id
    `,
    [token]
  )

  const row = rows[0]
  if (!row) return null
  if (!row.is_active) return null
  if (row.revoked_at) return null
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return null

  const roles = toStringArray(row.roles)
  const permissions = toStringArray(row.permissions)

  return {
    staffId: row.staff_id,
    sessionId: row.session_id,
    token: row.token,
    name: row.name,
    email: row.email,
    roles,
    permissions,
    primaryRole: roles[0] || 'admin'
  }
}

export function createStaffAuthMiddleware(pool: Pool) {
  return async (req: Request, res: Response, next: Function) => {
    try {
      const token = (req.headers.authorization || '').replace('Bearer ', '').trim()
      if (!token) {
        return sendError(res, 401, 'Admin session token missing')
      }
      const context = await getStaffContextByToken(pool, token)
      if (!context) {
        return sendError(res, 401, 'Invalid or expired admin session')
      }
      ;(req as any).staffId = context.staffId
      ;(req as any).staffSessionId = context.sessionId
      ;(req as any).staffSessionToken = context.token
      ;(req as any).userRole = context.primaryRole
      ;(req as any).userPermissions = context.permissions
      ;(req as any).staffContext = context
      next()
    } catch (err) {
      console.error('Staff auth middleware error:', err)
      sendError(res, 401, 'Failed to authenticate admin session')
    }
  }
}

export async function staffLogin(pool: Pool, req: Request, res: Response) {
  try {
    const { email, password } = req.body || {}
    const validationError = validateRequired({ email, password }, ['email', 'password'])
    if (validationError) return sendError(res, 400, validationError)

    const staff = await fetchStaffWithAccess(pool, 'email', String(email))
    if (!staff || !staff.is_active) {
      return sendError(res, 401, 'Invalid credentials')
    }

    const passwordOk = verifyPassword(staff.password, String(password))
    if (!passwordOk) {
      await pool.query(
        `update staff_users set failed_login_attempts = failed_login_attempts + 1, last_failed_login_at = now(), updated_at = now() where id = $1`,
        [staff.id]
      )
      await logStaff(pool, staff.id, 'login_failed', { email })
      return sendError(res, 401, 'Invalid credentials')
    }

    const sessionToken = `staff_${crypto.randomBytes(48).toString('hex')}`
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000)
    const userAgent = req.headers['user-agent'] || null
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null

    await pool.query(
      `insert into staff_sessions (staff_id, token, user_agent, ip_address, metadata, expires_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [staff.id, sessionToken, userAgent, ipAddress, JSON.stringify({ source: 'admin-panel' }), expiresAt]
    )

    await pool.query(
      `update staff_users
       set last_login_at = now(), failed_login_attempts = 0, updated_at = now(),
           password_changed_at = coalesce(password_changed_at, now())
       where id = $1`,
      [staff.id]
    )

    await logStaff(pool, staff.id, 'login', { ipAddress })

    sendSuccess(res, {
      token: sessionToken,
      user: toStaffResponse(staff)
    })
  } catch (err) {
    console.error('Failed to login staff:', err)
    sendError(res, 500, 'Failed to login', err)
  }
}

async function logStaff(pool: Pool, staffId: number | null, action: string, details?: any) {
  try {
    await pool.query(
      `insert into staff_activity_logs (staff_id, action, details, created_at) values ($1, $2, $3, now())`,
      [staffId, action, details ? JSON.stringify(details) : null]
    )
  } catch {}
}

export async function createRole(pool: Pool, req: Request, res: Response) {
  try {
    const { name, description } = req.body || {}
    const validationError = validateRequired({ name }, ['name'])
    if (validationError) return sendError(res, 400, validationError)
    const { rows } = await pool.query(
      `insert into roles (name, description, created_at, updated_at) values ($1, $2, now(), now()) returning *`,
      [name, description || null]
    )
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create role', err)
  }
}

export async function listRoles(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query('select * from roles order by name asc')
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list roles', err)
  }
}

export async function createPermission(pool: Pool, req: Request, res: Response) {
  try {
    const { code, description } = req.body || {}
    const validationError = validateRequired({ code }, ['code'])
    if (validationError) return sendError(res, 400, validationError)
    const { rows } = await pool.query(
      `insert into permissions (code, description) values ($1, $2) returning *`,
      [code, description || null]
    )
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create permission', err)
  }
}

export async function assignPermissionToRole(pool: Pool, req: Request, res: Response) {
  try {
    const { roleId, permissionId } = req.body || {}
    const validationError = validateRequired({ roleId, permissionId }, ['roleId', 'permissionId'])
    if (validationError) return sendError(res, 400, validationError)
    await pool.query(
      `insert into role_permissions (role_id, permission_id) values ($1, $2) on conflict do nothing`,
      [roleId, permissionId]
    )
    sendSuccess(res, { roleId, permissionId }, 201)
  } catch (err) {
    sendError(res, 500, 'Failed to assign permission', err)
  }
}

export async function createStaff(pool: Pool, req: Request, res: Response) {
  try {
    const { name, email, password } = req.body || {}
    const validationError = validateRequired({ name, email, password }, ['name', 'email', 'password'])
    if (validationError) return sendError(res, 400, validationError)
    const hashed = hashPassword(password)
    const { rows } = await pool.query(
      `insert into staff_users (name, email, password, is_active, created_at, updated_at) values ($1, $2, $3, true, now(), now()) returning *`,
      [name, email, hashed]
    )
    await logStaff(pool, rows[0]?.id || null, 'staff_create', { email })
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create staff user', err)
  }
}

export async function assignRoleToStaff(pool: Pool, req: Request, res: Response) {
  try {
    const { staffId, roleId } = req.body || {}
    const validationError = validateRequired({ staffId, roleId }, ['staffId', 'roleId'])
    if (validationError) return sendError(res, 400, validationError)
    await pool.query(
      `insert into staff_roles (staff_id, role_id) values ($1, $2) on conflict do nothing`,
      [staffId, roleId]
    )
    await logStaff(pool, staffId, 'assign_role', { roleId })
    sendSuccess(res, { staffId, roleId }, 201)
  } catch (err) {
    sendError(res, 500, 'Failed to assign role to staff', err)
  }
}

export async function listStaff(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(
      `select su.*, coalesce(json_agg(r.*) filter (where r.id is not null), '[]'::json) as roles
       from staff_users su
       left join staff_roles sr on sr.staff_id = su.id
       left join roles r on r.id = sr.role_id
       group by su.id
       order by su.created_at desc`
    )
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list staff users', err)
  }
}

export async function listPermissions(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query('select * from permissions order by code asc')
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list permissions', err)
  }
}

export async function getRolePermissions(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(`
      select r.id as role_id, r.name as role_name, p.id as permission_id, p.code as permission_code
      from roles r
      left join role_permissions rp on rp.role_id = r.id
      left join permissions p on p.id = rp.permission_id
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch role-permission matrix', err)
  }
}

export async function setRolePermissions(pool: Pool, req: Request, res: Response) {
  try {
    // Body shape: { roleId: number, permissionIds: number[] }
    const { roleId, permissionIds } = req.body || {}
    const validationError = validateRequired({ roleId }, ['roleId'])
    if (validationError) return sendError(res, 400, validationError)
    const ids = Array.isArray(permissionIds) ? permissionIds : []
    await pool.query('begin')
    await pool.query('delete from role_permissions where role_id = $1', [roleId])
    for (const pid of ids) {
      await pool.query('insert into role_permissions (role_id, permission_id) values ($1, $2) on conflict do nothing', [roleId, pid])
    }
    await pool.query('commit')
    sendSuccess(res, { roleId, permissionIds: ids })
  } catch (err) {
    await pool.query('rollback')
    sendError(res, 500, 'Failed to set role permissions', err)
  }
}

export async function listStaffActivity(pool: Pool, req: Request, res: Response) {
  try {
    const { staff_id, action, from, to } = (req.query || {}) as any
    const where: string[] = []
    const params: any[] = []
    if (staff_id) { where.push(`staff_id = $${params.length + 1}`); params.push(staff_id) }
    if (action) { where.push(`action ilike $${params.length + 1}`); params.push(`%${action}%`) }
    if (from) { where.push(`created_at >= $${params.length + 1}`); params.push(from) }
    if (to) { where.push(`created_at <= $${params.length + 1}`); params.push(to) }
    const sql = `select * from staff_activity_logs ${where.length? 'where '+where.join(' and '): ''} order by created_at desc limit 500`
    const { rows } = await pool.query(sql, params)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch staff activity logs', err)
  }
}

export async function staffLogout(pool: Pool, req: Request, res: Response) {
  try {
    const staffId = (req as any).staffId
    const sessionId = (req as any).staffSessionId
    if (!staffId || !sessionId) {
      return sendError(res, 401, 'Invalid admin session')
    }

    await pool.query('update staff_sessions set revoked_at = now() where id = $1 and revoked_at is null', [sessionId])
    await pool.query('update staff_users set last_logout_at = now(), updated_at = now() where id = $1', [staffId])
    await logStaff(pool, staffId, 'logout')
    sendSuccess(res, { success: true })
  } catch (err) {
    sendError(res, 500, 'Failed to logout', err)
  }
}

export async function staffMe(pool: Pool, req: Request, res: Response) {
  try {
    const staffId = (req as any).staffId
    if (!staffId) {
      return sendError(res, 401, 'Invalid admin session')
    }
    const staff = await fetchStaffWithAccess(pool, 'id', Number(staffId))
    if (!staff) {
      return sendError(res, 404, 'Staff account not found')
    }
    sendSuccess(res, { user: toStaffResponse(staff) })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch admin profile', err)
  }
}

export async function staffChangePassword(pool: Pool, req: Request, res: Response) {
  try {
    const staffId = (req as any).staffId
    const sessionId = (req as any).staffSessionId
    if (!staffId || !sessionId) {
      return sendError(res, 401, 'Invalid admin session')
    }

    const { currentPassword, newPassword, confirmNewPassword } = req.body || {}
    const validationError = validateRequired(
      { currentPassword, newPassword, confirmNewPassword },
      ['currentPassword', 'newPassword', 'confirmNewPassword']
    )
    if (validationError) return sendError(res, 400, validationError)
    if (String(newPassword).length < 8) {
      return sendError(res, 400, 'New password must be at least 8 characters long')
    }
    if (newPassword !== confirmNewPassword) {
      return sendError(res, 400, 'New password and confirmation do not match')
    }

    const staff = await fetchStaffWithAccess(pool, 'id', Number(staffId))
    if (!staff) {
      return sendError(res, 404, 'Staff account not found')
    }

    const validOldPassword = verifyPassword(staff.password, String(currentPassword))
    if (!validOldPassword) {
      await logStaff(pool, staffId, 'password_change_failed')
      return sendError(res, 400, 'Current password is incorrect')
    }

    const hashed = hashPassword(String(newPassword))
    await pool.query(
      `update staff_users
         set password = $2, password_changed_at = now(), updated_at = now()
       where id = $1`,
      [staffId, hashed]
    )

    await pool.query(
      `update staff_sessions
         set revoked_at = now()
       where staff_id = $1 and id <> $2 and revoked_at is null`,
      [staffId, sessionId]
    )

    await logStaff(pool, staffId, 'password_changed')
    sendSuccess(res, { success: true })
  } catch (err) {
    sendError(res, 500, 'Failed to update password', err)
  }
}

export async function resetPassword(pool: Pool, req: Request, res: Response) {
  try {
    const { staffId, newPassword } = req.body || {}
    const validationError = validateRequired({ staffId, newPassword }, ['staffId', 'newPassword'])
    if (validationError) return sendError(res, 400, validationError)
    const hashed = hashPassword(newPassword)
    const { rows } = await pool.query(`update staff_users set password = $2, updated_at = now() where id = $1 returning id`, [staffId, hashed])
    if (rows.length === 0) return sendError(res, 404, 'Staff not found')
    await logStaff(pool, staffId, 'reset_password')
    sendSuccess(res, { staffId })
  } catch (err) {
    sendError(res, 500, 'Failed to reset password', err)
  }
}

export async function disableStaff(pool: Pool, req: Request, res: Response) {
  try {
    const { staffId } = req.body || {}
    const validationError = validateRequired({ staffId }, ['staffId'])
    if (validationError) return sendError(res, 400, validationError)
    const { rows } = await pool.query(`update staff_users set is_active = false, updated_at = now() where id = $1 returning id`, [staffId])
    if (rows.length === 0) return sendError(res, 404, 'Staff not found')
    await logStaff(pool, staffId, 'disable_account')
    sendSuccess(res, { staffId, is_active: false })
  } catch (err) {
    sendError(res, 500, 'Failed to disable staff', err)
  }
}

export async function seedStandardRolesAndPermissions(pool: Pool, req: Request, res: Response) {
  try {
    const standardPerms = [
      'products:read','products:update','orders:read','orders:update','shipping:read','shipping:update','invoices:read','returns:read','returns:update','returns:create','analytics:read','marketing:read','users:read','users:update','cms:read','payments:read','pos:read','pos:update'
    ]
    const standardRoles: Record<string, string[]> = {
      'admin': standardPerms,
      'manager': ['products:read','products:update','orders:read','orders:update','shipping:read','shipping:update','invoices:read','returns:read','returns:update','analytics:read','marketing:read','users:read'],
      'staff': ['orders:read','orders:update','shipping:read','shipping:update','invoices:read','returns:read','returns:update'],
      'viewer': ['products:read','orders:read','analytics:read']
    }
    await pool.query('begin')
    // Ensure permissions
    const permIdByCode: Record<string, number> = {}
    for (const code of standardPerms) {
      const pr = await pool.query(`insert into permissions (code) values ($1) on conflict (code) do nothing returning id`, [code])
      if (pr.rows[0]?.id) permIdByCode[code] = pr.rows[0].id
      else {
        const sel = await pool.query('select id from permissions where code = $1', [code])
        if (sel.rows[0]?.id) permIdByCode[code] = sel.rows[0].id
      }
    }
    // Ensure roles and assignments
    for (const [roleName, codes] of Object.entries(standardRoles)) {
      const rr = await pool.query(`insert into roles (name) values ($1) on conflict (name) do nothing returning id`, [roleName])
      const roleId = rr.rows[0]?.id || (await pool.query('select id from roles where name = $1', [roleName])).rows[0]?.id
      if (!roleId) continue
      await pool.query('delete from role_permissions where role_id = $1', [roleId])
      for (const code of codes) {
        const pid = permIdByCode[code]
        if (pid) await pool.query('insert into role_permissions (role_id, permission_id) values ($1, $2) on conflict do nothing', [roleId, pid])
      }
    }
    await pool.query('commit')
    sendSuccess(res, { ok: true })
  } catch (err) {
    await pool.query('rollback')
    sendError(res, 500, 'Failed to seed roles/permissions', err)
  }
}


