import React from 'react'
import type { AuthorProfile } from '../types'

export function BanNotice({ author }: { author: AuthorProfile }) {
  if (author.status !== 'banned' && author.status !== 'inactive') return null

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950">
      <strong className="font-semibold">Profile restricted.</strong> Your author account is marked{' '}
      <span className="font-mono text-xs">{author.status}</span>.
      {author.status === 'banned' &&
      typeof author.ban_public_message === 'string' &&
      author.ban_public_message.trim() ? (
        <p className="mt-2 text-[13px] leading-relaxed text-amber-950">{author.ban_public_message.trim()}</p>
      ) : (
        <span className="mt-2 block">
          Readers can&apos;t open your public author page until a moderator sets your status back to active. You can
          still use this dashboard while signed in.
        </span>
      )}
    </div>
  )
}
