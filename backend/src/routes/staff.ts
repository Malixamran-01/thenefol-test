import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'
import crypto from 'crypto'

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex')
  return `${salt}:${hash}`
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


