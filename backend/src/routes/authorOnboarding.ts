import express, { Request, Response } from 'express'
import { Pool } from 'pg'
import { authenticateToken } from '../utils/apiHelpers'
import { addRoleToUser } from '../middleware/roleCheck'

const router = express.Router()
let pool: Pool | null = null

export const initAuthorOnboardingRouter = (dbPool: Pool) => {
  pool = dbPool
}

// ==================== AUTHOR ONBOARDING FLOW ====================

/**
 * Step 0: Check if user can become an author
 * Returns user's current status and whether they already have an author profile
 */
router.get('/check-eligibility', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const userId = req.userId

    // Check if user already has an author profile
    const { rows: authorRows } = await pool.query(
      `SELECT id, username, onboarding_completed, status 
       FROM author_profiles 
       WHERE user_id = $1`,
      [userId]
    )

    // Get user roles
    const { rows: userRows } = await pool.query(
      `SELECT roles FROM users WHERE id = $1`,
      [userId]
    )

    const hasAuthorProfile = authorRows.length > 0
    const hasAuthorRole = userRows[0]?.roles?.includes('AUTHOR')
    const onboardingCompleted = authorRows[0]?.onboarding_completed || false

    res.json({
      eligible: true,
      hasAuthorProfile,
      hasAuthorRole,
      onboardingCompleted,
      authorProfile: hasAuthorProfile ? authorRows[0] : null
    })
  } catch (error) {
    console.error('Error checking author eligibility:', error)
    res.status(500).json({ message: 'Failed to check eligibility' })
  }
})

/**
 * Step 1: Identity (Pen name, username, profile picture)
 */
router.post('/onboarding/step1', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const userId = req.userId
    const { username, display_name, pen_name, real_name, profile_image } = req.body

    if (!username || !display_name) {
      return res.status(400).json({ message: 'Username and display name are required' })
    }

    // Check if username is taken
    const { rows: existingRows } = await pool.query(
      `SELECT id FROM author_profiles WHERE username = $1 AND user_id != $2`,
      [username, userId]
    )

    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'Username already taken' })
    }

    // Check if user already has an author profile (resume onboarding)
    const { rows: profileRows } = await pool.query(
      `SELECT id FROM author_profiles WHERE user_id = $1`,
      [userId]
    )

    let authorId: number

    if (profileRows.length > 0) {
      // Update existing profile
      const { rows } = await pool.query(
        `UPDATE author_profiles 
         SET username = $1, display_name = $2, pen_name = $3, real_name = $4, profile_image = $5
         WHERE user_id = $6
         RETURNING id`,
        [username, display_name, pen_name, real_name, profile_image, userId]
      )
      authorId = rows[0].id
    } else {
      // Create new profile
      const { rows } = await pool.query(
        `INSERT INTO author_profiles (user_id, username, display_name, pen_name, real_name, profile_image)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [userId, username, display_name, pen_name, real_name, profile_image]
      )
      authorId = rows[0].id
    }

    res.json({
      message: 'Step 1 completed',
      authorId,
      nextStep: '/onboarding/step2'
    })
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Username already taken' })
    }
    console.error('Error in onboarding step 1:', error)
    res.status(500).json({ message: 'Failed to save profile information' })
  }
})

/**
 * Step 2: About the Author (Bio, interests, categories)
 */
router.post('/onboarding/step2', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const userId = req.userId
    const { bio, writing_categories, writing_languages, location } = req.body

    // Update author profile
    const { rows } = await pool.query(
      `UPDATE author_profiles 
       SET bio = $1, 
           writing_categories = $2, 
           writing_languages = $3, 
           location = $4
       WHERE user_id = $5
       RETURNING id`,
      [bio, writing_categories, writing_languages, location, userId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Author profile not found. Complete step 1 first.' })
    }

    res.json({
      message: 'Step 2 completed',
      nextStep: '/onboarding/step3'
    })
  } catch (error) {
    console.error('Error in onboarding step 2:', error)
    res.status(500).json({ message: 'Failed to save about information' })
  }
})

/**
 * Step 3: Social Presence (Twitter, Instagram, LinkedIn, website)
 */
router.post('/onboarding/step3', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const userId = req.userId
    const { website, social_links, email_visible } = req.body

    // Update author profile
    const { rows } = await pool.query(
      `UPDATE author_profiles 
       SET website = $1, 
           social_links = $2, 
           email_visible = $3
       WHERE user_id = $4
       RETURNING id`,
      [website, social_links || {}, email_visible || false, userId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Author profile not found. Complete previous steps first.' })
    }

    res.json({
      message: 'Step 3 completed',
      nextStep: '/onboarding/step4'
    })
  } catch (error) {
    console.error('Error in onboarding step 3:', error)
    res.status(500).json({ message: 'Failed to save social links' })
  }
})

/**
 * Step 4: Author Preferences (Comments, subscriptions, products)
 */
router.post('/onboarding/step4', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const userId = req.userId
    const { preferences } = req.body

    // Default preferences
    const authorPreferences = {
      allow_comments: preferences?.allow_comments ?? true,
      allow_subscriptions: preferences?.allow_subscriptions ?? true,
      allow_paid_subscriptions: preferences?.allow_paid_subscriptions ?? false,
      show_products: preferences?.show_products ?? false,
      ...preferences
    }

    // Update author profile
    const { rows } = await pool.query(
      `UPDATE author_profiles 
       SET preferences = $1
       WHERE user_id = $2
       RETURNING id`,
      [authorPreferences, userId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Author profile not found. Complete previous steps first.' })
    }

    res.json({
      message: 'Step 4 completed',
      nextStep: '/onboarding/complete'
    })
  } catch (error) {
    console.error('Error in onboarding step 4:', error)
    res.status(500).json({ message: 'Failed to save preferences' })
  }
})

/**
 * Step 5: Complete Onboarding (Mark as complete, add AUTHOR role)
 */
router.post('/onboarding/complete', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const userId = req.userId

    // Mark onboarding as complete
    const { rows } = await pool.query(
      `UPDATE author_profiles 
       SET onboarding_completed = true, 
           status = 'active'
       WHERE user_id = $1
       RETURNING id, username, display_name`,
      [userId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Author profile not found. Complete previous steps first.' })
    }

    // Add AUTHOR role to user
    await addRoleToUser(parseInt(userId), 'AUTHOR')

    res.json({
      message: 'Congratulations! Your author profile is ready.',
      author: rows[0],
      status: 'complete'
    })
  } catch (error) {
    console.error('Error completing onboarding:', error)
    res.status(500).json({ message: 'Failed to complete onboarding' })
  }
})

/**
 * Get current onboarding progress
 */
router.get('/onboarding/progress', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const userId = req.userId

    const { rows } = await pool.query(
      `SELECT 
        username IS NOT NULL AND display_name IS NOT NULL as step1_complete,
        bio IS NOT NULL as step2_complete,
        website IS NOT NULL OR social_links::text != '{}'::text as step3_complete,
        preferences IS NOT NULL as step4_complete,
        onboarding_completed
       FROM author_profiles
       WHERE user_id = $1`,
      [userId]
    )

    if (rows.length === 0) {
      return res.json({
        started: false,
        currentStep: 1,
        progress: 0
      })
    }

    const progress = rows[0]
    const stepsComplete = [
      progress.step1_complete,
      progress.step2_complete,
      progress.step3_complete,
      progress.step4_complete
    ].filter(Boolean).length

    res.json({
      started: true,
      onboardingCompleted: progress.onboarding_completed,
      currentStep: progress.onboarding_completed ? 5 : stepsComplete + 1,
      progress: (stepsComplete / 4) * 100,
      steps: {
        step1: progress.step1_complete,
        step2: progress.step2_complete,
        step3: progress.step3_complete,
        step4: progress.step4_complete
      }
    })
  } catch (error) {
    console.error('Error fetching onboarding progress:', error)
    res.status(500).json({ message: 'Failed to fetch progress' })
  }
})

export default router
