import Razorpay from 'razorpay'

// Credentials come only from the environment (never hard-code keys in source).
export const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID || '').trim()
export const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || '').trim()
/** Webhook secret configured in the Razorpay dashboard; falls back to the key secret (previous behaviour). */
export const RAZORPAY_WEBHOOK_SECRET = (process.env.RAZORPAY_WEBHOOK_SECRET || RAZORPAY_KEY_SECRET).trim()

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn('⚠️  [razorpay] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set — online payments, refunds and payouts are disabled.')
}

export function isRazorpayConfigured(): boolean {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET)
}

let client: Razorpay | null = null

/** Lazily created so a missing key never crashes the server at import time. */
export function getRazorpay(): Razorpay {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay is not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)')
  }
  if (!client) {
    client = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
  }
  return client
}
