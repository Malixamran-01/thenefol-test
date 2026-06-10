/** Public URL prefix for the admin panel SPA (nginx location + React Router). */
export const ADMIN_BASE = '/loginasadmin'

export function adminPath(segment: string = ''): string {
  if (!segment) return ADMIN_BASE
  const normalized = segment.startsWith('/') ? segment.slice(1) : segment
  return `${ADMIN_BASE}/${normalized}`
}
