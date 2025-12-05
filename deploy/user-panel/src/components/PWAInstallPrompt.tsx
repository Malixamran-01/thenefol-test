import React, { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

const PROMPT_STORAGE_KEY = 'pwa-install-prompt-last-seen'
const PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
      
      // Show prompt after a delay (don't be too aggressive)
      const lastSeen = parseInt(localStorage.getItem(PROMPT_STORAGE_KEY) || '0', 10) || 0
      if (!lastSeen || Date.now() - lastSeen > PROMPT_COOLDOWN_MS) {
        setTimeout(() => {
          setShowPrompt(true)
        }, 3000) // Show after 3 seconds
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if app was installed
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
      setShowInstallButton(false)
      localStorage.setItem(PROMPT_STORAGE_KEY, Date.now().toString())
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }
    
    setDeferredPrompt(null)
    setShowPrompt(false)
    setShowInstallButton(false)
    localStorage.setItem(PROMPT_STORAGE_KEY, Date.now().toString())
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem(PROMPT_STORAGE_KEY, Date.now().toString())
  }

  if (!deferredPrompt && !showInstallButton) {
    return null
  }

  return (
    <>
      {showInstallButton && deferredPrompt && !showPrompt && (
        <button
          onClick={() => setShowPrompt(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-lg transition hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Install app
        </button>
      )}

      {showPrompt && deferredPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-slide-up">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Install Nefol App
                </h3>
                <p className="text-sm text-slate-600">
                  Install our app for a better experience with offline access and faster loading.
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="ml-4 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleInstall}
                className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors text-sm"
                style={{ minHeight: '44px' }}
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm"
                style={{ minHeight: '44px' }}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

