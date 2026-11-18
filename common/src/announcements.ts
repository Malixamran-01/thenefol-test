/**
 * Homepage announcement strip (the scrolling bar under the navbar).
 *
 * Admin saves several messages (CMS section `scrolling_text_banner`, content.messages).
 * The strip shows them in order on one line, separated by ✦, and starts again after the
 * last one. Older saves only have content.text: one message per line.
 */

export const MAX_ANNOUNCEMENTS = 8

/** The non-empty messages to show, in order. */
export function parseAnnouncements(content: unknown): string[] {
  const c = (content && typeof content === 'object' ? content : {}) as { messages?: unknown; text?: unknown }
  const raw = Array.isArray(c.messages)
    ? c.messages
    : typeof c.text === 'string'
      ? c.text.split(/\r?\n/)
      : []
  return raw
    .map((m) => (typeof m === 'string' ? m.replace(/\s+/g, ' ').trim() : ''))
    .filter(Boolean)
    .slice(0, MAX_ANNOUNCEMENTS)
}

/** What admin saves: the messages, plus text (one per line) for anything still reading the old field. */
export function announcementContent(messages: string[]) {
  const clean = parseAnnouncements({ messages })
  return { messages: clean, text: clean.join('\n') }
}

/**
 * One half of the scrolling track: the messages in order, repeated until the half holds at
 * least `minItems` entries so the strip is always full. The strip renders this half twice and
 * scrolls by exactly one half, so the loop is seamless and the order never breaks.
 */
export function announcementLoop(messages: string[], minItems = 6): string[] {
  if (messages.length === 0) return []
  const rounds = Math.max(1, Math.ceil(minItems / messages.length))
  return Array.from({ length: rounds }, () => messages).flat()
}
