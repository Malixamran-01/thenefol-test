import { Request, Response, NextFunction } from 'express'
import { Pool } from 'pg'

// Extend Express Request to include userId and userRoles
declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRoles?: string[]
    }
  }
}

let pool: Pool | null = null

export const initRoleCheck = (dbPool: Pool) => {
  pool = dbPool
}

/**
 * Middleware to check if user has required role(s)
 * Usage: requireRole('AUTHOR') or requireRole(['AUTHOR', 'ADMIN'])
 */
export const requireRole = (requiredRoles: string | string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!pool) {
        return res.status(500).json({ message: 'Database not initialized' })
      }

      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' })
      }

      // Get user roles from database
      const { rows } = await pool.query(
        `SELECT roles FROM users WHERE id = $1`,
        [userId]
      )

      if (rows.length === 0) {
        return res.status(404).json({ message: 'User not found' })
      }

      const userRoles: string[] = rows[0].roles || ['USER']
      
      // Store roles in request for later use
      req.userRoles = userRoles

      // Check if user has any of the required roles
      const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
      const hasRole = rolesArray.some(role => userRoles.includes(role))

      if (!hasRole) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          required: rolesArray,
          current: userRoles
        })
      }

      next()
    } catch (error) {
      console.error('Error checking user role:', error)
      res.status(500).json({ message: 'Failed to verify permissions' })
    }
  }
}

/**
 * Middleware to check if user is an author (has author profile)
 */
export const requireAuthorProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    // Check if user has an author profile
    const { rows } = await pool.query(
      `SELECT id FROM author_profiles WHERE user_id = $1 AND status = 'active'`,
      [userId]
    )

    if (rows.length === 0) {
      return res.status(403).json({ 
        message: 'Author profile required',
        hint: 'Create an author profile first to access this feature'
      })
    }

    next()
  } catch (error) {
    console.error('Error checking author profile:', error)
    res.status(500).json({ message: 'Failed to verify author profile' })
  }
}

/**
 * Helper function to add role to user
 */
export const addRoleToUser = async (userId: number, role: string): Promise<boolean> => {
  try {
    if (!pool) {
      throw new Error('Database not initialized')
    }

    await pool.query(
      `UPDATE users 
       SET roles = array_append(roles, $2)
       WHERE id = $1 AND NOT ($2 = ANY(roles))`,
      [userId, role]
    )

    return true
  } catch (error) {
    console.error('Error adding role to user:', error)
    return false
  }
}

/**
 * Helper function to remove role from user
 */
export const removeRoleFromUser = async (userId: number, role: string): Promise<boolean> => {
  try {
    if (!pool) {
      throw new Error('Database not initialized')
    }

    await pool.query(
      `UPDATE users 
       SET roles = array_remove(roles, $2)
       WHERE id = $1`,
      [userId, role]
    )

    return true
  } catch (error) {
    console.error('Error removing role from user:', error)
    return false
  }
}
