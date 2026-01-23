/**
 * Google OAuth Authentication Routes
 * 
 * This module handles Google Sign-In authentication for both login and signup
 * 
 * @module routes/googleAuth
 */

import { Pool } from 'pg'
import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { sendError, sendSuccess } from '../utils/apiHelpers'
import { generateUserId } from '../utils/generateUserId'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

/**
 * Verify Google ID token and authenticate/register user
 * 
 * POST /api/auth/google
 * Body: { "idToken": "google_id_token", "accessToken": "google_access_token" }
 * 
 * @param {Pool} pool - Database pool
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export async function googleAuth(pool: Pool, req: Request, res: Response) {
  try {
    const { idToken, accessToken } = req.body

    if (!idToken && !accessToken) {
      return sendError(res, 400, 'Google token is required')
    }

    // Verify the Google token by calling Google's userinfo endpoint
    let googleUser
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken || idToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Invalid Google token')
      }

      googleUser = await response.json()
    } catch (error) {
      console.error('Google token verification failed:', error)
      return sendError(res, 401, 'Invalid Google token')
    }

    const { email, name, picture, sub: googleId } = googleUser

    if (!email) {
      return sendError(res, 400, 'Email not provided by Google')
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

      // Update google_id and profile_photo if not set
      if (!user.google_id || !user.profile_photo) {
        await pool.query(
          `UPDATE users 
           SET google_id = COALESCE(google_id, $1),
               profile_photo = COALESCE(profile_photo, $2),
               updated_at = NOW()
           WHERE id = $3`,
          [googleId, picture, user.id]
        )
      }
    } else {
      // User doesn't exist - create new account
      const userId = await generateUserId(pool)
      
      const insertResult = await pool.query(
        `INSERT INTO users (
          user_id, email, name, password, 
          google_id, profile_photo, is_verified, 
          loyalty_points, total_orders, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          userId,
          email,
          name || 'Google User',
          '', // No password for Google users
          googleId,
          picture,
          true, // Email is verified by Google
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
    console.error('Google auth error:', error)
    return sendError(res, 500, 'Failed to authenticate with Google')
  }
}
