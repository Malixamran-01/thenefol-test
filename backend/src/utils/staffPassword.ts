import crypto from 'crypto'

/** scrypt hash format: salt:hash (hex) — shared by staff login and invitation accept */
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(stored: string, plain: string): boolean {
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
