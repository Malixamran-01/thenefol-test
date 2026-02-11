import { getApiBaseUrl } from '../utils/apiBase'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }
}

export interface AuthorEligibilityResponse {
  eligible: boolean
  hasAuthorProfile: boolean
  hasAuthorRole: boolean
  onboardingCompleted: boolean
  authorProfile: {
    id: number
    username: string
    onboarding_completed: boolean
    status: string
  } | null
}

export interface OnboardingProgressResponse {
  started: boolean
  onboardingCompleted: boolean
  currentStep: number
  progress: number
  steps: {
    step1: boolean
    step2: boolean
    step3: boolean
    step4: boolean
  }
}

export const authorAPI = {
  /**
   * Check if user can become an author
   */
  async checkEligibility(): Promise<AuthorEligibilityResponse> {
    const response = await fetch(`${getApiBaseUrl()}/api/authors/check-eligibility`, {
      headers: getAuthHeaders()
    })
    if (!response.ok) {
      throw new Error('Failed to check eligibility')
    }
    return response.json()
  },

  /**
   * Get onboarding progress
   */
  async getProgress(): Promise<OnboardingProgressResponse> {
    const response = await fetch(`${getApiBaseUrl()}/api/authors/onboarding/progress`, {
      headers: getAuthHeaders()
    })
    if (!response.ok) {
      throw new Error('Failed to get progress')
    }
    return response.json()
  },

  /**
   * Step 1: Identity (username, display name, profile image)
   */
  async submitStep1(data: {
    username: string
    display_name: string
    pen_name?: string
    real_name?: string
    profile_image?: string
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/authors/onboarding/step1`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to save step 1')
    }
    return response.json()
  },

  /**
   * Step 2: About (bio, categories, languages)
   */
  async submitStep2(data: {
    bio?: string
    writing_categories?: string[]
    writing_languages?: string[]
    location?: string
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/authors/onboarding/step2`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to save step 2')
    }
    return response.json()
  },

  /**
   * Step 3: Social presence (website, social links)
   */
  async submitStep3(data: {
    website?: string
    social_links?: {
      twitter?: string
      instagram?: string
      linkedin?: string
      [key: string]: string | undefined
    }
    email_visible?: boolean
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/authors/onboarding/step3`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to save step 3')
    }
    return response.json()
  },

  /**
   * Step 4: Preferences (comments, subscriptions, products)
   */
  async submitStep4(data: {
    preferences: {
      allow_comments?: boolean
      allow_subscriptions?: boolean
      allow_paid_subscriptions?: boolean
      show_products?: boolean
      [key: string]: boolean | undefined
    }
  }) {
    const response = await fetch(`${getApiBaseUrl()}/api/authors/onboarding/step4`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to save step 4')
    }
    return response.json()
  },

  /**
   * Complete onboarding (activate author profile)
   */
  async completeOnboarding() {
    const response = await fetch(`${getApiBaseUrl()}/api/authors/onboarding/complete`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to complete onboarding')
    }
    return response.json()
  }
}
