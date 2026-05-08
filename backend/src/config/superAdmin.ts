import crypto from 'crypto'

export const SUPER_ADMIN_CONFIG = {
  email: process.env.SUPER_ADMIN_EMAIL ?? '',
  password: process.env.SUPER_ADMIN_PASSWORD ?? '',
  name: process.env.SUPER_ADMIN_NAME ?? 'Super Admin',
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
