import { ShieldCheck } from 'lucide-react'

/** Shown next to author names when the server marks the author as verified (active profile + is_verified). */
export function AuthorVerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 align-middle text-sky-600 ${className}`} title="Verified author">
      <ShieldCheck className="h-4 w-4" strokeWidth={2} aria-hidden />
    </span>
  )
}
