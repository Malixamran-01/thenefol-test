import React from 'react'
import { X, Video, Lock, Handshake } from 'lucide-react'

interface JoinUsModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectCollab: () => void
  onSelectAffiliate: () => void
  affiliateUnlocked: boolean
}

export default function JoinUsModal({
  isOpen,
  onClose,
  onSelectCollab,
  onSelectAffiliate,
  affiliateUnlocked,
}: JoinUsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--color-card-bg, #fff)',
          color: 'var(--color-text-body, #1a1a1a)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 transition-colors hover:bg-black/5"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-2 text-xl font-bold" style={{ fontFamily: 'var(--font-heading-family)' }}>
          Join Us
        </h2>
        <p className="mb-6 text-sm opacity-80">
          Choose how you&apos;d like to partner with NEFOL®
        </p>

        <div className="space-y-3">
          {/* Collab — unlocked */}
          <button
            onClick={() => {
              onSelectCollab()
              onClose()
            }}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-[#1B4965]/20 p-4 text-left transition-all hover:border-[#1B4965]/40 hover:bg-[#1B4965]/5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1B4965]/10">
              <Video className="h-6 w-6" style={{ color: '#1B4965' }} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">Collab</h3>
              <p className="text-xs opacity-70">
                Create a reel with our products, get featured, and progress toward Affiliate
              </p>
            </div>
            <span className="text-xs font-medium text-emerald-600">Available</span>
          </button>

          {/* Affiliate — locked or unlocked */}
          <button
            onClick={() => {
              if (affiliateUnlocked) {
                onSelectAffiliate()
                onClose()
              }
            }}
            disabled={!affiliateUnlocked}
            className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
              affiliateUnlocked
                ? 'border-[#1B4965]/20 hover:border-[#1B4965]/40 hover:bg-[#1B4965]/5 cursor-pointer'
                : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-80'
            }`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-200">
              <Handshake className="h-6 w-6 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold flex items-center gap-2">
                Affiliate
                {!affiliateUnlocked && <Lock className="h-3.5 w-3.5 text-amber-500" />}
              </h3>
              <p className="text-xs opacity-70">
                {affiliateUnlocked
                  ? 'Earn commissions promoting NEFOL products'
                  : 'Complete the Collab program to unlock Affiliate'}
              </p>
            </div>
            {affiliateUnlocked ? (
              <span className="text-xs font-medium text-emerald-600">Available</span>
            ) : (
              <span className="text-xs font-medium text-amber-600">Locked</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
