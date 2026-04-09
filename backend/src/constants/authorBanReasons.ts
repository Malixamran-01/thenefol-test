/**
 * Preset reasons when an admin sets author_profiles.status = 'banned'.
 * `publicMessage` is shown to the author on their dashboard / profile (when implemented in UI).
 */
export const AUTHOR_BAN_REASONS: {
  key: string
  label: string
  /** Shown to the author; empty string means admin must supply ban_public_message (e.g. "other") */
  publicMessage: string
}[] = [
  {
    key: 'policy_violation',
    label: 'Community or content policy violation',
    publicMessage:
      'Your author profile was restricted because of a violation of our community or content guidelines. If you believe this is a mistake, contact support.',
  },
  {
    key: 'spam_promotional',
    label: 'Spam, misleading, or excessive promotional content',
    publicMessage:
      'Your author profile was restricted due to spam, misleading content, or repeated promotional abuse. Contact support if you would like to appeal.',
  },
  {
    key: 'harassment',
    label: 'Harassment, hate, or harmful behaviour',
    publicMessage:
      'Your author profile was restricted following reports of harassment, hate speech, or harmful behaviour toward others.',
  },
  {
    key: 'impersonation',
    label: 'Impersonation or false identity',
    publicMessage:
      'Your author profile was restricted because of impersonation or misrepresentation of identity or affiliation.',
  },
  {
    key: 'copyright',
    label: 'Copyright or intellectual property issues',
    publicMessage:
      'Your author profile was restricted due to repeated copyright or intellectual property concerns with your content.',
  },
  {
    key: 'platform_abuse',
    label: 'Abuse of platform features (bots, fake engagement, etc.)',
    publicMessage:
      'Your author profile was restricted due to abuse of platform features, such as artificial engagement or automation.',
  },
  {
    key: 'other',
    label: 'Other (write a message to the author below)',
    publicMessage: '',
  },
]

export function isValidBanReasonKey(key: string): boolean {
  return AUTHOR_BAN_REASONS.some((r) => r.key === key)
}

export function resolveBanPublicMessage(key: string, customMessage: string | undefined): { ok: true; message: string } | { ok: false; error: string } {
  const preset = AUTHOR_BAN_REASONS.find((r) => r.key === key)
  if (!preset) return { ok: false, error: 'Invalid ban reason' }
  if (key === 'other') {
    const msg = typeof customMessage === 'string' ? customMessage.trim() : ''
    if (msg.length < 10) return { ok: false, error: 'Enter a clear message to the author (at least 10 characters).' }
    return { ok: true, message: msg }
  }
  if (!preset.publicMessage) return { ok: false, error: 'Invalid preset message' }
  return { ok: true, message: preset.publicMessage }
}
