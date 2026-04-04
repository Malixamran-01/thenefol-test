/** Client-side NEFOL Social preferences (per browser profile). */

export const NEFOL_SOCIAL_CREATOR_PROGRAM_SIDEBAR_KEY = 'nefol_social_creator_program_sidebar'

export const NEFOL_SOCIAL_SETTINGS_CHANGE = 'nefol-social-settings-change'

export function getCreatorProgramSidebarEnabled(): boolean {
  try {
    return localStorage.getItem(NEFOL_SOCIAL_CREATOR_PROGRAM_SIDEBAR_KEY) === 'true'
  } catch {
    return false
  }
}

export function setCreatorProgramSidebarEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(NEFOL_SOCIAL_CREATOR_PROGRAM_SIDEBAR_KEY, enabled ? 'true' : 'false')
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(NEFOL_SOCIAL_SETTINGS_CHANGE))
}

/** Topic tags for “Manage interests” (NEFOL Social — local only, for future feeds). */
export const NEFOL_SOCIAL_INTERESTS_KEY = 'nefol_social_content_interests'

export const SOCIAL_INTEREST_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'skincare', label: 'Skincare' },
  { id: 'hair', label: 'Hair care' },
  { id: 'body', label: 'Body care' },
  { id: 'wellness', label: 'Wellness & rituals' },
  { id: 'ingredients', label: 'Ingredients & science' },
  { id: 'sustainability', label: 'Sustainability' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'community', label: 'Community stories' },
]

export function getSocialInterests(): string[] {
  try {
    const raw = localStorage.getItem(NEFOL_SOCIAL_INTERESTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function setSocialInterests(ids: string[]): void {
  try {
    localStorage.setItem(NEFOL_SOCIAL_INTERESTS_KEY, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(NEFOL_SOCIAL_SETTINGS_CHANGE))
}
