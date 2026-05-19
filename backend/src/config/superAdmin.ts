import crypto from 'crypto'

export const SUPER_ADMIN_CONFIG = {
  email: process.env.SUPER_ADMIN_EMAIL ?? '',
  password: process.env.SUPER_ADMIN_PASSWORD ?? '',
  name: process.env.SUPER_ADMIN_NAME ?? 'Super Admin',
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Super admin is defined only by .env — not staff_users.is_super_admin */
export function isEnvSuperAdminConfigured(): boolean {
  return !!(SUPER_ADMIN_CONFIG.email && SUPER_ADMIN_CONFIG.password)
}

export function isEnvSuperAdminEmail(email: string): boolean {
  if (!isEnvSuperAdminConfigured()) return false
  return normalizeEmail(email) === normalizeEmail(SUPER_ADMIN_CONFIG.email)
}

export function verifyEnvSuperAdminPassword(plain: string): boolean {
  const expected = SUPER_ADMIN_CONFIG.password
  if (!expected) return false
  try {
    const a = Buffer.from(plain, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length) {
      crypto.timingSafeEqual(a, a)
      return false
    }
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export const INVITATION_EXPIRY_HOURS = Number(process.env.INVITATION_EXPIRY_HOURS ?? 48)

/** Public origin of the admin SPA (no trailing slash), e.g. https://thenefol.com */
export function getAdminPanelOrigin(): string {
  const raw = process.env.ADMIN_PANEL_URL ?? 'https://thenefol.com'
  return raw.replace(/\/$/, '')
}

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex')
}
