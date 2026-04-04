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
