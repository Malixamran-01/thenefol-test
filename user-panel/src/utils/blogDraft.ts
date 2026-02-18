/**
 * Blog draft utilities - local auto-save + server sync
 * 3 layers: local (instant), server (cross-device), manual (user-controlled)
 */

const LOCAL_DRAFT_KEY = 'blog_draft'
const DEBOUNCE_MS = 4000
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

/** Returns false for empty/placeholder content (e.g. <p><br></p>) */
export function hasRealDraftContent(draft: { title?: string; content?: string; excerpt?: string } | null): boolean {
  if (!draft) return false
  const stripHtml = (s: string) => (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
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

export { DEBOUNCE_MS, SERVER_SYNC_INTERVAL_MS, LOCAL_DRAFT_KEY }
