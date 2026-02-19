import React from 'react'
import { Sparkles, X, ChevronRight } from 'lucide-react'

interface AuthorPromptModalProps {
  isOpen: boolean
  onClose: () => void
}

const AuthorPromptModal: React.FC<AuthorPromptModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  const handleCreateProfile = () => {
    window.location.hash = '#/user/author/onboarding'
  }

  const handleContinueWithoutProfile = () => {
    window.location.hash = '#/user/blog/request?new=1'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
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
            <Sparkles className="h-10 w-10 text-white" />
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
        <div className="mb-6 space-y-3 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 p-6">
          <h3 className="font-semibold text-gray-900">What you'll get:</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-[#4B97C9]">✓</span>
              <span>Your own author page with bio and social links</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4B97C9]">✓</span>
              <span>Build a following with subscribers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4B97C9]">✓</span>
              <span>Track your post performance and engagement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4B97C9]">✓</span>
              <span>Optional: Showcase your products</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleCreateProfile}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4B97C9] to-[#1B4965] px-6 py-3 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Create Author Profile
            <ChevronRight className="h-5 w-5" />
          </button>

          <button
            onClick={handleContinueWithoutProfile}
            className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-6 py-3 font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            title="Continue to blog request form"
          >
            Continue without profile
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          You can always create your author profile later from your account settings
        </p>
      </div>
    </div>
  )
}

export default AuthorPromptModal
