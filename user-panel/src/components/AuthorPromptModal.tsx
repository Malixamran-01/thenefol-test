import React, { useState } from 'react'
import { PenLine, X, ChevronRight, ExternalLink } from 'lucide-react'

interface AuthorPromptModalProps {
  isOpen: boolean
  onClose: () => void
}

const AuthorPromptModal: React.FC<AuthorPromptModalProps> = ({ isOpen, onClose }) => {
  const [agreed, setAgreed] = useState(false)

  if (!isOpen) return null

  const handleCreateProfile = () => {
    if (!agreed) return
    sessionStorage.setItem('author_onboarding_return', '#/user/blog/request?new=1')
    window.location.hash = '#/user/author/onboarding'
  }

  const handleContinueWithoutProfile = () => {
    if (!agreed) return
    window.location.hash = '#/user/blog/request?new=1'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-gradient-to-r from-[#4B97C9] to-[#1B4965] p-4">
            <PenLine className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-3 text-center text-2xl font-bold text-gray-900">
          Looks like you want to publish content
        </h2>

        {/* Description */}
        <p className="mb-6 text-center text-gray-600">
          To share your stories with our community, you'll need to create an author profile. It only takes a few minutes!
        </p>

        {/* Benefits */}
        <div className="mb-5 space-y-3 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 p-5">
          <h3 className="font-semibold text-gray-900">What you'll get:</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            {[
              'Your own author page with bio and social links',
              'Build a following with subscribers',
              'Track your post performance and engagement',
              'Optional: Showcase your products',
            ].map(b => (
              <li key={b} className="flex items-start gap-2">
                <span className="text-[#4B97C9]">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Agreement checkbox ── */}
        <div className="mb-5 rounded-xl border border-[#4B97C9]/30 bg-[#F0F9FF] p-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            
            <span className="text-sm text-gray-700 leading-relaxed">
              I have read and agree to the{' '}
              <a
                href="#/user/creator-agreement"
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="font-semibold text-[#4B97C9] underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-0.5"
              >
                User Agreement
                <ExternalLink className="w-3 h-3" />
              </a>{' '}
              and the{' '}
              <a
                href="#/user/terms-of-service"
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="font-semibold text-[#4B97C9] underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-0.5"
              >
              Terms &amp; Conditions
                <ExternalLink className="w-3 h-3" />
              </a>
              . I understand that by publishing content I irrevocably assign all rights to that content to Nefol Aesthetics Private Limited.
            </span>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#4B97C9] focus:ring-[#4B97C9] flex-shrink-0"
            />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleCreateProfile}
            disabled={!agreed}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4B97C9] to-[#1B4965] px-6 py-3 text-white font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:opacity-90"
          >
            Create Author Profile
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* <button
            onClick={handleContinueWithoutProfile}
            disabled={!agreed}
            className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-6 py-3 font-medium text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-gray-100"
            title="Continue to blog request form"
          >
            Continue without profile
          </button> */}
        </div>

        {!agreed && (
          <p className="mt-3 text-center text-xs text-amber-600">
            Please read and accept the Agreement above to continue.
          </p>
        )}

        {/* <p className="mt-4 text-center text-xs text-gray-500">
          You can always create your author profile later from your account settings
        </p> */}
      </div>
    </div>
  )
}

export default AuthorPromptModal
