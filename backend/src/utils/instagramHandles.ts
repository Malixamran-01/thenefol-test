/** Normalize Instagram handle for comparison (no @, lowercased). */
export function normalizeHandle(handle: string): string {
  return String(handle || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
}

/** Merge comma-separated instagram field + optional list into unique normalized handles. */
export function parseInstagramHandles(instagram: string | null | undefined, instagramHandles?: string[]): string[] {
  const fromList = Array.isArray(instagramHandles) ? instagramHandles : []
  const fromSingle = String(instagram || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
  const merged = [...fromList, ...fromSingle].map(normalizeHandle).filter(Boolean)
  return Array.from(new Set(merged))
}
