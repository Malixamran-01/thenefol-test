import { useState, useEffect } from 'react'
import { cmsService, CMSPageData } from '../services/cms'
import CMSSection from '../components/CMSSection'
import { useRealtimeCMS } from '../hooks/useRealtimeCMS'
import { Wifi, WifiOff } from 'lucide-react'

/**
 * Universal CMS Page Template
 * 
 * Usage:
 * 1. Copy this file and rename it (e.g., AboutPage.tsx)
 * 2. Change the pageName prop in useCMSPage
 * 3. Customize the loading and error states if needed
 * 
 * Example:
 * ```tsx
 * import CMSPageTemplate from './CMSPageTemplate'
 * 
 * export default function AboutPage() {
 *   return <CMSPageTemplate pageName="about" />
 * }
 * ```
 */

interface CMSPageTemplateProps {
  pageName: string
  className?: string
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
}

export default function CMSPageTemplate({ 
  pageName,
  className = '',
  loadingComponent,
  errorComponent
}: CMSPageTemplateProps) {
  // Use real-time hook for automatic updates
  const { content, loading, error, isConnected, lastUpdate } = useRealtimeCMS(pageName)

  if (loading) {
    return loadingComponent || <DefaultLoading />
  }

  if (error || !content?.page) {
    return errorComponent || <DefaultError pageName={pageName} />
  }

  return (
    <main className={`min-h-screen overflow-x-hidden ${className}`} style={{backgroundColor: '#F4F9F9'}}>
      {/* SEO Meta Tags - You can add react-helmet here */}
      <title>{content.page.page_title || 'Nefol'}</title>
      
      {/* Real-time connection indicator (optional, can be hidden) */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-full shadow-lg p-2 border border-gray-200">
          <div className="flex items-center gap-2 px-3 py-1">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-600">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400">Offline</span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Render all sections */}
      {content.sections.map((section) => (
        <CMSSection key={section.id} section={section} />
      ))}
    </main>
  )
}

/**
 * Hook to fetch CMS page content
 */
export function useCMSPage(pageName: string) {
  const [content, setContent] = useState<CMSPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadContent = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await cmsService.getPageContent(pageName)
        
        if (mounted) {
          setContent(data)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load content')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadContent()

    return () => {
      mounted = false
    }
  }, [pageName])

  return { content, loading, error }
}

// Default Loading Component
function DefaultLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F4F9F9'}}>
      <div className="text-center">
        <p className="mt-4 text-lg" style={{color: '#1B4965'}}>Loading...</p>
      </div>
    </div>
  )
}

// Default Error Component
function DefaultError({ pageName }: { pageName: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F4F9F9'}}>
      <div className="text-center max-w-md px-4">
        <div className="mb-6">
          <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-serif mb-2" style={{color: '#1B4965'}}>Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          The page "{pageName}" hasn't been created in the CMS yet.
        </p>
        <div className="space-y-2">
          <a 
            href="#/user/" 
            className="inline-block px-6 py-3 text-white font-medium rounded-lg transition-all duration-300"
            style={{backgroundColor: '#4B97C9'}}
          >
            Go Home
          </a>
          <p className="text-sm text-gray-500 mt-4">
            Admin: Go to <a href="/cms" className="underline">CMS Panel</a> to create this page
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Quick Page Creator - For rapid development
 * 
 * Usage:
 * ```tsx
 * // In your routing file
 * import { createCMSPage } from './CMSPageTemplate'
 * 
 * const AboutPage = createCMSPage('about')
 * const ContactPage = createCMSPage('contact')
 * const BlogPage = createCMSPage('blog')
 * ```
 */
export function createCMSPage(pageName: string) {
  return function CMSPage() {
    return <CMSPageTemplate pageName={pageName} />
  }
}

