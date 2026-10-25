// Centralized API utilities to eliminate duplicate code
import { Request, Response } from 'express'
import { Pool } from 'pg'
import { extractBearerToken, verifyUserToken } from './authTokens'

/** Minimal shape of a validated staff session (see routes/staff.ts getStaffContextByToken). */
export type StaffSessionContext = {
  staffId: number
  sessionId: number
  token: string
  roles: string[]
  permissions: string[]
  primaryRole: string
  isSuperAdmin: boolean
  layoutPermissions?: string[]
  pagePermissions?: string[] | null
}

type StaffContextResolver = (token: string) => Promise<StaffSessionContext | null>

let staffContextResolver: StaffContextResolver | null = null

/** Registered once from index.ts (avoids a circular import with routes/staff.ts). */
export function registerStaffContextResolver(resolver: StaffContextResolver) {
  staffContextResolver = resolver
}

export async function resolveStaffContext(token: string | null | undefined): Promise<StaffSessionContext | null> {
  if (!token || !token.startsWith('staff_') || !staffContextResolver) return null
  return staffContextResolver(token)
}

export function attachStaffContext(req: Request, context: StaffSessionContext) {
  ;(req as any).staffId = context.staffId
  ;(req as any).staffSessionId = context.sessionId
  ;(req as any).staffSessionToken = context.token
  ;(req as any).userRole = context.primaryRole
  ;(req as any).userPermissions = context.permissions
  ;(req as any).staffLayoutPermissions = context.layoutPermissions
  ;(req as any).staffPagePermissions = context.pagePermissions
  ;(req as any).staffContext = context
}

export function getStaffContext(req: Request): StaffSessionContext | undefined {
  return (req as any).staffContext as StaffSessionContext | undefined
}

/**
 * Transitional: the admin panel still sends x-user-role / x-user-permissions. They are only honoured
 * for requests that already carry a valid staff session. Set STAFF_HEADER_PERMISSIONS_COMPAT=0 once
 * every staff role has the right permissions assigned in Roles & Permissions.
 */
function staffHeaderCompatEnabled(): boolean {
  return process.env.STAFF_HEADER_PERMISSIONS_COMPAT !== '0'
}

function headerPermissions(req: Request): string[] {
  const raw = String(req.headers['x-user-permissions'] || '')
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

/** True when the request has a valid staff session that grants every permission in `perms`. */
export function staffHasPermissions(req: Request, perms: string[]): boolean {
  const ctx = getStaffContext(req)
  if (!ctx) return false
  if (ctx.isSuperAdmin || ctx.primaryRole === 'admin') return true
  const granted = Array.isArray(ctx.permissions) ? ctx.permissions : []
  if (perms.every(p => granted.includes(p))) return true
  if (staffHeaderCompatEnabled()) {
    const fromHeader = headerPermissions(req)
    if (perms.every(p => fromHeader.includes(p))) return true
  }
  return false
}

// Standardized error response
export function sendError(res: Response, status: number, message: string, error?: any) {
  if (error !== undefined && error !== null && error !== '') {
    console.error(`API Error [${status}]:`, message, error)
  } else {
    console.error(`API Error [${status}]:`, message)
  }
  res.status(status).json({ error: message })
}

// Standardized success response
export function sendSuccess(res: Response, data: any, status: number = 200) {
  res.status(status).json(data)
}

// Generic GET handler for simple table queries
export async function handleGetAll(
  pool: Pool, 
  res: Response, 
  tableName: string, 
  orderBy: string = 'created_at DESC',
  additionalQuery?: string
) {
  try {
    const query = additionalQuery || `SELECT * FROM ${tableName} ORDER BY ${orderBy}`
    const { rows } = await pool.query(query)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, `Failed to fetch ${tableName}`, err)
  }
}

// Generic POST handler for table creation
export async function handleCreate(
  pool: Pool,
  res: Response,
  tableName: string,
  fields: string[],
  values: any[],
  broadcastEvent?: string,
  broadcastData?: any
) {
  try {
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ')
    const query = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`
    const { rows } = await pool.query(query, values)
    
    if (broadcastEvent && broadcastData) {
      // Broadcast update if needed
      console.log(`Broadcasting ${broadcastEvent}:`, broadcastData)
    }
    
    sendSuccess(res, rows[0], 201)
  } catch (err: any) {
    if (err?.code === '23505') {
      sendError(res, 409, `${tableName} already exists`)
    } else {
      sendError(res, 500, `Failed to create ${tableName}`, err)
    }
  }
}

// Generic UPDATE handler
export async function handleUpdate(
  pool: Pool,
  res: Response,
  tableName: string,
  id: string,
  updates: Record<string, any>,
  idField: string = 'id'
) {
  try {
    const fields = Object.keys(updates).filter(key => updates[key] !== undefined)
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ')
    const values = [id, ...fields.map(field => updates[field])]
    
    const query = `UPDATE ${tableName} SET ${setClause}, updated_at = NOW() WHERE ${idField} = $1 RETURNING *`
    const { rows } = await pool.query(query, values)
    
    if (rows.length === 0) {
      return sendError(res, 404, `${tableName} not found`)
    }
    
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, `Failed to update ${tableName}`, err)
  }
}

// Authentication middleware: a valid staff session (staff_… token) or a signed customer token.
export function authenticateToken(req: Request, res: Response, next: Function) {
  const token = extractBearerToken(req)

  if (!token) {
    return sendError(res, 401, 'No token provided')
  }

  if (token.startsWith('staff_')) {
    const existing = getStaffContext(req)
    if (existing && existing.token === token) {
      return next()
    }
    resolveStaffContext(token)
      .then((context) => {
        if (!context) return sendError(res, 401, 'Invalid or expired admin session')
        attachStaffContext(req, context)
        next()
      })
      .catch((err) => {
        console.error('Staff session validation failed:', err)
        sendError(res, 401, 'Invalid or expired admin session')
      })
    return
  }

  const userId = verifyUserToken(token)
  if (!userId) {
    return sendError(res, 401, 'Invalid or expired token')
  }

  req.userId = userId
  next()
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    const ctx = getStaffContext(req)
    if (!ctx) {
      return sendError(res, 403, 'Forbidden')
    }
    if (ctx.isSuperAdmin || roles.includes(ctx.primaryRole) || ctx.roles.some(r => roles.includes(r))) {
      return next()
    }
    if (staffHeaderCompatEnabled()) {
      const headerRole = String(req.headers['x-user-role'] || '').trim()
      if (headerRole && roles.includes(headerRole)) return next()
    }
    return sendError(res, 403, 'Forbidden')
  }
}

export function requirePermission(perms: string[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!staffHasPermissions(req, perms)) return sendError(res, 403, 'Forbidden')
    next()
  }
}

// CSV parsing utility
export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

// Validation helpers
export function validateRequired(body: any, fields: string[]): string | null {
  for (const field of fields) {
    if (!body[field]) {
      return `${field} is required`
    }
  }
  return null
}

// Database transaction helper
export async function withTransaction<T>(
  pool: Pool, 
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}