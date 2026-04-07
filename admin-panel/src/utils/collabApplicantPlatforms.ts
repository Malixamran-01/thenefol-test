/**
 * Collab application `platforms[]` uses `name` keys from the creator form
 * (e.g. instagram, youtube, reddit). Map to persisted task platform keys.
 */
export const TASK_PLATFORM_LABELS: Record<string, string> = {
  instagram_reel: 'Instagram',
  youtube: 'YouTube',
  reddit: 'Reddit',
  x: 'X (Twitter)',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  other: 'Other',
}

export type ApplicantPlatform = { name?: string; link?: string; links?: string[] }

/** One application platform row → one or more assignable task keys */
export function applicantPlatformToTaskKeys(name: string): string[] {
  const n = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  const map: Record<string, string[]> = {
    instagram: ['instagram_reel'],
    ig: ['instagram_reel'],
    youtube: ['youtube'],
    reddit: ['reddit'],
    x: ['x'],
    twitter: ['x'],
    tiktok: ['tiktok'],
    facebook: ['facebook'],
    fb: ['facebook'],
    linkedin: ['other'],
    telegram: ['other'],
    snapchat: ['other'],
    vk: ['other'],
    quora: ['other'],
    other: ['other'],
  }
  return map[n] || ['other']
}

export function buildTaskPlatformOptionsFromApplicant(applicantPlatforms: ApplicantPlatform[] | undefined | null): {
  key: string
  label: string
}[] {
  if (!Array.isArray(applicantPlatforms) || applicantPlatforms.length === 0) return []
  const seen = new Set<string>()
  const out: { key: string; label: string }[] = []
  for (const row of applicantPlatforms) {
    const name = typeof row?.name === 'string' ? row.name : ''
    if (!name.trim()) continue
    const keys = applicantPlatformToTaskKeys(name)
    const pretty = name.replace(/_/g, ' ')
    for (const key of keys) {
      if (seen.has(key)) continue
      seen.add(key)
      const baseLabel = TASK_PLATFORM_LABELS[key] || pretty
      const label = key === 'other' && pretty && pretty !== 'other' ? `${baseLabel} (${pretty})` : baseLabel
      out.push({ key, label })
    }
  }
  return out
}
