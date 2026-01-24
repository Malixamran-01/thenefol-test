/**
 * Facebook OAuth Authentication Routes
 * 
 * This module handles Facebook Sign-In authentication for both login and signup
 * 
 * @module routes/facebookAuth
 */

import { Pool } from 'pg'
import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { sendError, sendSuccess } from '../utils/apiHelpers'
import { generateUniqueUserId } from '../utils/generateUserId'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// TypeScript interface for Facebook user info
interface FacebookUserInfo {
  id?: string
  email?: string
  name?: string
  picture?: {
    data?: {
      url?: string
    }
  }
}

/**
 * Verify Facebook access token and authenticate/register user
 * 
 * POST /api/auth/facebook
 * Body: { "accessToken": "facebook_access_token", "userID": "facebook_user_id" }
 * 
 * @param {Pool} pool - Database pool
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export async function facebookAuth(pool: Pool, req: Request, res: Response) {
  try {
    const { accessToken, userID } = req.body

    if (!accessToken || !userID) {
      return sendError(res, 400, 'Facebook access token and user ID are required')
    }

    // Verify the Facebook token by calling Facebook's Graph API
    let facebookUser: FacebookUserInfo
    try {
      const response = await fetch(
        `https://graph.facebook.com/v12.0/me?fields=id,name,email,picture&access_token=${accessToken}`
      )

      if (!response.ok) {
        throw new Error('Invalid Facebook token')
      }

      facebookUser = await response.json() as FacebookUserInfo
      
      // Verify the user ID matches
      if (facebookUser.id !== userID) {
        throw new Error('User ID mismatch')
      }
    } catch (error) {
      console.error('Facebook token verification failed:', error)
      return sendError(res, 401, 'Invalid Facebook token')
    }

    const { email, name, picture } = facebookUser
    const facebookId = facebookUser.id
    const profilePhoto = picture?.data?.url

    if (!email) {
      return sendError(res, 400, 'Email not provided by Facebook')
    }

    // Check if user exists
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    let user

    if (userQuery.rows.length > 0) {
      // User exists - login
      user = userQuery.rows[0]

      // Update facebook_id and profile_photo if not set
      if (!user.facebook_id || !user.profile_photo) {
        await pool.query(
          `UPDATE users 
           SET facebook_id = COALESCE(facebook_id, $1),
               profile_photo = COALESCE(profile_photo, $2),
               updated_at = NOW()
           WHERE id = $3`,
          [facebookId, profilePhoto, user.id]
        )
      }
    } else {
      // User doesn't exist - create new account
      const userId = await generateUniqueUserId(pool)
      
      const insertResult = await pool.query(
        `INSERT INTO users (
          user_id, email, name, password, 
          facebook_id, profile_photo, is_verified, 
          loyalty_points, total_orders, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          userId,
          email,
          name || 'Facebook User',
          '', // No password for Facebook users
          facebookId,
          profilePhoto,
          true, // Email is verified by Facebook
          0,
          0
        ]
      )

      user = insertResult.rows[0]
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        user_id: user.user_id 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    // Return user data and token
    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || { street: '', city: '', state: '', zip: '' },
        profile_photo: user.profile_photo,
        loyalty_points: user.loyalty_points || 0,
        total_orders: user.total_orders || 0,
        member_since: user.created_at,
        is_verified: user.is_verified
      }
    })
  } catch (error) {
    console.error('Facebook auth error:', error)
    return sendError(res, 500, 'Failed to authenticate with Facebook')
  }
}
