import { ArrowDown, ArrowUp } from 'lucide-react'

interface VoteColumnProps {
  score: number
  myVote: 1 | -1 | 0
  onUpvote: () => void
  onDownvote: () => void
  compact?: boolean
}

export default function VoteColumn({
  score,
  myVote,
  onUpvote,
  onDownvote,
  compact = false,
}: VoteColumnProps) {
  const w = compact ? 'w-8' : 'w-10'

  return (
    <div
      className={`flex ${w} flex-shrink-0 flex-col items-center self-start rounded-full border border-[#e8eef4] bg-[#fafcfd] py-1.5`}
    >
      <button
        type="button"
        onClick={onUpvote}
        aria-label="Upvote"
        className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
          myVote === 1
            ? 'bg-orange-50 text-orange-500'
            : 'text-[#94a3b8] hover:bg-[#f0f4f8] hover:text-orange-400'
        }`}
      >
        <ArrowUp className="h-3.5 w-3.5" strokeWidth={myVote === 1 ? 2.5 : 2} />
      </button>
      <span
        className={`my-0.5 min-w-[1.25rem] text-center text-[11px] font-bold tabular-nums leading-none ${
          myVote === 1
            ? 'text-orange-500'
            : myVote === -1
              ? 'text-[#4B97C9]'
              : 'text-[#64748b]'
        }`}
      >
        {score}
      </span>
      <button
        type="button"
        onClick={onDownvote}
        aria-label="Downvote"
        className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
          myVote === -1
            ? 'bg-[#edf4f9] text-[#4B97C9]'
            : 'text-[#94a3b8] hover:bg-[#f0f4f8] hover:text-[#4B97C9]'
        }`}
      >
        <ArrowDown className="h-3.5 w-3.5" strokeWidth={myVote === -1 ? 2.5 : 2} />
      </button>
    </div>
  )
}
