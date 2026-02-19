/**
 * Blog draft utilities - local auto-save + server sync
 * 3 layers: local (instant), server (cross-device), manual (user-controlled)
 */

const LOCAL_DRAFT_KEY = 'blog_draft'
const ACTIVE_DRAFT_TAB_KEY = 'blog_draft_active_tab'
const SESSION_ID_KEY = 'blog_draft_session_id'
const DEBOUNCE_MS = 2500
const SERVER_SYNC_INTERVAL_MS = 45000

export interface DraftPayload {
  title: string
  content: string
  excerpt: string
  author_name: string
  author_email: string
  meta_title: string
  meta_description: string
  meta_keywords: string
  og_title: string
  og_description: string
  og_image: string
  canonical_url: string
  categories: string[]
  allow_comments: boolean
  updatedAt: string
  draftId?: number
  version?: number
}

export function getLocalDraft(): DraftPayload | null {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DraftPayload
    return parsed?.updatedAt ? parsed : null
  } catch {
    return null
  }
}

export function saveLocalDraft(payload: Omit<DraftPayload, 'updatedAt'>) {
  try {
    if (!hasRealDraftContent(payload)) return null
    const withTime = { ...payload, updatedAt: new Date().toISOString() }
    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(withTime))
    return withTime.updatedAt
  } catch (e) {
    console.warn('Failed to save local draft:', e)
    return null
  }
}

export function clearLocalDraft() {
  try {
    localStorage.removeItem(LOCAL_DRAFT_KEY)
  } catch {
    // ignore
  }
}

/** Returns false for empty/placeholder content (e.g. <p><br></p>, &nbsp;) */
export function hasRealDraftContent(draft: { title?: string; content?: string; excerpt?: string } | null): boolean {
  if (!draft) return false
  const stripHtml = (s: string) =>
    (s || '')
      .replace(/<p><br><\/p>/gi, '')
      .replace(/<br\s*\/?>/gi, '')
      .replace(/&nbsp;/g, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  const hasTitle = (draft.title || '').trim().length > 0
  const hasExcerpt = (draft.excerpt || '').trim().length > 0
  const hasContent = stripHtml(draft.content || '').length > 0
  return hasTitle || hasExcerpt || hasContent
}

export function getDraftAge(draft: DraftPayload): string {
  const updated = new Date(draft.updatedAt).getTime()
  const diff = Date.now() - updated
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`
  return `${Math.floor(diff / 86400000)} days ago`
}

export function getActiveDraftTabId(): string {
  try {
    return sessionStorage.getItem('blog_draft_tab_id') || (() => {
      const id = crypto.randomUUID?.() || `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem('blog_draft_tab_id', id)
      return id
    })()
  } catch {
    return `tab-${Date.now()}`
  }
}

export function setActiveDraftTab(): void {
  try {
    const id = getActiveDraftTabId()
    localStorage.setItem(ACTIVE_DRAFT_TAB_KEY, JSON.stringify({ tabId: id, at: Date.now() }))
  } catch { /* ignore */ }
}

export function clearActiveDraftTab(): void {
  try {
    const id = getActiveDraftTabId()
    const raw = localStorage.getItem(ACTIVE_DRAFT_TAB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.tabId === id) localStorage.removeItem(ACTIVE_DRAFT_TAB_KEY)
    }
  } catch { /* ignore */ }
}

export function isActiveDraftTab(cb: (active: boolean) => void): () => void {
  const id = getActiveDraftTabId()
  const check = () => {
    try {
      const raw = localStorage.getItem(ACTIVE_DRAFT_TAB_KEY)
      if (!raw) { cb(true); return }
      const parsed = JSON.parse(raw)
      cb(parsed?.tabId === id)
    } catch {
      cb(true)
    }
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === ACTIVE_DRAFT_TAB_KEY) check()
  }
  window.addEventListener('storage', onStorage)
  check()
  return () => window.removeEventListener('storage', onStorage)
}

/** Get or create session_id for current writing session. Cleared on publish. */
export function getOrCreateDraftSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY)
    if (!id) {
      id = crypto.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem(SESSION_ID_KEY, id)
    }
    return id
  } catch {
    return `session-${Date.now()}`
  }
}

/** Clear session_id (call after successful publish) */
export function clearDraftSessionId(): void {
  try {
    sessionStorage.removeItem(SESSION_ID_KEY)
  } catch {
    // ignore
  }
}

export { DEBOUNCE_MS, SERVER_SYNC_INTERVAL_MS, LOCAL_DRAFT_KEY, ACTIVE_DRAFT_TAB_KEY }
