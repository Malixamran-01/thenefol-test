// Points calculation utility
// 1 rupee = 10 nefol coins

export const COINS_CONVERSION_RATE = 10 // 1 rupee = 10 nefol coins

export function rupeesToCoins(rupees: number): number {
  return Math.floor(rupees * COINS_CONVERSION_RATE)
}

export function coinsToRupees(coins: number): number {
  return coins / COINS_CONVERSION_RATE
}

export function calculateCoinsFromOrder(orderValue: number): number {
  return rupeesToCoins(orderValue)
}

export function calculateDiscountFromCoins(coins: number): number {
  return coinsToRupees(coins)
}

export function formatCoins(coins: number): string {
  return `${coins} coins`
}

export function formatCoinsWithValue(coins: number): string {
  const rupees = coinsToRupees(coins)
  return `${coins} coins (₹${rupees.toFixed(2)})`
}

// Coins earning rates for different activities
export const COINS_RATES = {
  PURCHASE: 10, // 10 coins per ₹1 spent
  REVIEW: 100, // 100 coins for writing a review
  REFERRAL: 500, // 500 coins for successful referral
  BIRTHDAY: 1000, // 1000 coins on birthday
  FIRST_ORDER: 250, // 250 coins for first order
  SOCIAL_SHARE: 50, // 50 coins for social media share
} as const

export function calculatePurchaseCoins(orderValue: number): number {
  return Math.floor(orderValue * COINS_CONVERSION_RATE)
}

export function calculateReviewCoins(): number {
  return COINS_RATES.REVIEW
}

export function calculateReferralCoins(): number {
  return COINS_RATES.REFERRAL
}

export function calculateBirthdayCoins(): number {
  return COINS_RATES.BIRTHDAY
}

export function calculateFirstOrderCoins(): number {
  return COINS_RATES.FIRST_ORDER
}

export function calculateSocialShareCoins(): number {
  return COINS_RATES.SOCIAL_SHARE
}
