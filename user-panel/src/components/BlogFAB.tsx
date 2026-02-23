import React, { useState, useRef, useEffect } from 'react'
import { Plus, FileText, Edit3, MessageCircle, LayoutList, BookOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authorAPI } from '../services/authorAPI'
import AuthorPromptModal from './AuthorPromptModal'

const MENU_ITEMS = [
  { id: 'write', label: 'Write blog', icon: FileText, action: 'write' },
  { id: 'drafts', label: 'Drafts', icon: LayoutList, action: 'drafts' },
  { id: 'edit', label: 'Edit blog', icon: Edit3, action: 'edit' },
  { id: 'view', label: 'View blog', icon: BookOpen, action: 'view' },
  { id: 'support', label: 'Support', icon: MessageCircle, action: 'support' },
] as const

export default function BlogFAB() {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [showAuthorPrompt, setShowAuthorPrompt] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleAction = async (action: string) => {
    setOpen(false)
    switch (action) {
      case 'write':
        if (!isAuthenticated) {
          sessionStorage.setItem('post_login_redirect', '#/user/blog')
          window.location.hash = '#/user/login'
          return
        }
        try {
          const eligibility = await authorAPI.checkEligibility()
          const canSubmit =
            Boolean(eligibility.hasAuthorRole) &&
            Boolean(eligibility.hasAuthorProfile) &&
            Boolean(eligibility.onboardingCompleted)
          if (canSubmit) {
            window.location.hash = '#/user/blog/request?new=1'
          } else {
            setShowAuthorPrompt(true)
          }
        } catch {
          setShowAuthorPrompt(true)
        }
        break
      case 'drafts':
        window.location.hash = '#/user/blog?drafts=1'
        break
      case 'edit':
        // Placeholder - user will add functionality later
        break
      case 'view':
        window.location.hash = '#/user/blog'
        break
      case 'support':
        window.dispatchEvent(new CustomEvent('open-live-chat'))
        break
      default:
        break
    }
  }

  return (
    <>
      <div ref={menuRef} className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-2">
        {/* Menu - appears above the button */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            open ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
          }`}
          style={{ transformOrigin: 'bottom right' }}
        >
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 py-2 min-w-[180px]">
            {MENU_ITEMS.map((item, i) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => handleAction(item.action)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 ${
                    i === 0 ? 'rounded-t-lg' : ''
                  } ${i === MENU_ITEMS.length - 1 ? 'rounded-b-lg' : ''}`}
                >
                  <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* FAB Button */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-white"
          style={{
            backgroundColor: 'rgb(75,151,201)',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'
          }}
          aria-label={open ? 'Close menu' : 'Open blog menu'}
        >
          <Plus className="h-6 w-6 md:h-7 md:w-7" />
        </button>
      </div>

      <AuthorPromptModal isOpen={showAuthorPrompt} onClose={() => setShowAuthorPrompt(false)} />
    </>
  )
}
