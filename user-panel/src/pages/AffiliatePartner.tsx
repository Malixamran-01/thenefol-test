import React, { useState, useEffect } from 'react'
import { ArrowLeft, BarChart3, Copy, CheckCircle, Clock, AlertCircle, UserPlus, Key, Percent, IndianRupee, Users, TrendingUp, Award, Coins, Smartphone, FileText, Mail, Video, X, Folder, Search, Download, Image as ImageIcon, FileDown, ChevronDown, ChevronUp, Info, ExternalLink, Package, Eye, Heart } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
interface AffiliateData {
  id: string
  user_id: string
  partner_id?: string
  referral_code: string
  referral_link: string
  commission_rate: number
  total_referrals: number
  total_earnings: number
  conversion_rate: number
  is_verified: boolean
  created_at: string
  last_payment: string
  email?: string
  phone?: string
}

interface Referral {
  id: string
  affiliate_id: string
  referred_user_id: string
  referred_user_name: string
  customer_name?: string
  commission_amount: number
  commission_earned?: number
  order_total?: number
  order_items?: string | any[]
  referral_date?: string
  status: string
  created_at: string
}

interface ApplicationStatus {
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  message?: string
}

export interface AffiliatePartnerProps {
  /** Render inside Creator Program (Collab) — no duplicate top padding / back nav */
  embedInCreatorProgram?: boolean
  /** Which Creator Program tab this instance backs */
  embeddedSegment?: 'affiliate' | 'revenue'
}

const AffiliatePartner: React.FC<AffiliatePartnerProps> = ({
  embedInCreatorProgram = false,
  embeddedSegment,
}) => {
  // Force refresh - timestamp: 1761382000000
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [affiliateSource, setAffiliateSource] = useState<'profile' | 'home' | null>(null)

useEffect(() => {
  const source = sessionStorage.getItem('affiliate_referrer') as 'profile' | 'home' | null
  setAffiliateSource(source)
}, [])

  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [referralsPage, setReferralsPage] = useState(1)
  const [referralsTotalPages, setReferralsTotalPages] = useState(1)
  const [referralsTotal, setReferralsTotal] = useState(0)
  const [referralsLoading, setReferralsLoading] = useState(false)
  const [hasSubmittedApplication, setHasSubmittedApplication] = useState(false)
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus['status']>('not_submitted')
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState('')
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false)
  const [showCodeForm, setShowCodeForm] = useState(false)
  const [collabEligible, setCollabEligible] = useState(false)
  const [collabEligibleLoading, setCollabEligibleLoading] = useState(true)
  const [collabApplyTerms, setCollabApplyTerms] = useState(false)
  const [collabApplySubmitting, setCollabApplySubmitting] = useState(false)
  const [collabStats, setCollabStats] = useState<{ views: number; likes: number } | null>(null)
  const [commissionSettings, setCommissionSettings] = useState({ commission_percentage: 15.0, is_active: true })
  const [marketingMaterials, setMarketingMaterials] = useState<any>(null)
  const [nefolCoins, setNefolCoins] = useState(0)
  const [copySuccess, setCopySuccess] = useState(false)
  const [activeMaterialTab, setActiveMaterialTab] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [selectedCurrency, setSelectedCurrency] = useState<'INR' | 'USD' | 'EUR' | 'RUB'>('INR')
  const [revTab, setRevTab] = useState<'overview' | 'referrals' | 'payouts'>('overview')

  useEffect(() => {
    if (!embedInCreatorProgram || !embeddedSegment) return
    if (embeddedSegment === 'affiliate') setRevTab('overview')
    if (embeddedSegment === 'revenue') setRevTab('overview')
  }, [embedInCreatorProgram, embeddedSegment])

  useEffect(() => {
    if (embedInCreatorProgram && embeddedSegment === 'affiliate' && revTab === 'payouts') setRevTab('overview')
  }, [embedInCreatorProgram, embeddedSegment, revTab])

  const mainEmbed = embedInCreatorProgram
    ? 'min-h-0 bg-white overflow-x-hidden pt-0'
    : 'min-h-screen bg-white overflow-x-hidden pt-14 lg:pt-0'

  const partnerDashboardRevTabs: { key: 'overview' | 'referrals' | 'payouts'; label: string }[] =
    embedInCreatorProgram && embeddedSegment === 'affiliate'
      ? [
          { key: 'overview', label: 'Overview' },
          { key: 'referrals', label: 'Referrals' },
        ]
      : [
          { key: 'overview', label: 'Overview' },
          { key: 'referrals', label: 'Referrals' },
          { key: 'payouts', label: 'Payouts' },
        ]

  // Sync commissionSettings with affiliateData whenever commissionSettings changes
  useEffect(() => {
    if (commissionSettings?.commission_percentage !== undefined && affiliateData) {
      setAffiliateData((prevData) => {
        if (prevData && prevData.commission_rate !== commissionSettings.commission_percentage) {
          return {
            ...prevData,
            commission_rate: commissionSettings.commission_percentage
          }
        }
        return prevData
      })
    }
  }, [commissionSettings])

  useEffect(() => {
    if (!user?.email) {
      setCollabEligible(false)
      setCollabEligibleLoading(false)
      return
    }
    const controller = new AbortController()
    const token = localStorage.getItem('token')
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    setCollabEligibleLoading(true)

    Promise.all([
      fetch(`${getApiBase()}/api/collab/affiliate-unlocked?email=${encodeURIComponent(user.email)}`, { signal: controller.signal, headers }),
      fetch(`${getApiBase()}/api/collab/status?email=${encodeURIComponent(user.email)}`, { signal: controller.signal, headers }),
    ])
      .then(async ([unlockRes, statusRes]) => {
        const unlockData = await unlockRes.json().catch(() => ({}))
        setCollabEligible(!!unlockData?.unlocked)
        if (statusRes.ok) {
          const sd = await statusRes.json().catch(() => ({}))
          const v = sd.total_views ?? 0
          const l = sd.total_likes ?? 0
          if (v > 0 || l > 0) setCollabStats({ views: v, likes: l })
        }
      })
      .catch(() => setCollabEligible(false))
      .finally(() => setCollabEligibleLoading(false))

    return () => controller.abort()
  }, [user?.email])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    const initializeData = async () => {
      try {
        // Run all initialization tasks in parallel for better performance
        await Promise.allSettled([
          checkApplicationStatus(),
          fetchCommissionSettings(),
          fetchMarketingMaterials(),
          fetchNefolCoins()
        ])
        console.log('All affiliate data initialized successfully')
      } catch (error) {
        console.error('Failed to initialize affiliate data:', error)
      } finally {
        setLoading(false)
      }
    }
    initializeData()

    // Set up socket listener for commission updates
    const setupSocketListener = () => {
      if ((window as any).io) {
        (window as any).io.on('commission_settings_updated', (data: any) => {
          console.log('Commission settings updated:', data)
          setCommissionSettings(data)
          // Update affiliateData commission_rate to reflect the new commission
          setAffiliateData((prevData) => {
            if (prevData) {
              return {
                ...prevData,
                commission_rate: data.commission_percentage || prevData.commission_rate
              }
            }
            return prevData
          })
          // Show notification to user
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Commission Rate Updated', {
              body: `New commission rate: ${data.commission_percentage}%`,
              icon: '/favicon.ico'
            })
          }
        })
      }
    }
    setupSocketListener()

    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Affiliate data loading timeout - setting loading to false')
        setLoading(false)
        // Show a helpful message to the user
        console.log('If you continue to experience issues, please refresh the page or contact support.')
      }
    }, 10000) // Increased timeout to 10 seconds
    return () => clearTimeout(timeout)
  }, [])

  const checkApplicationStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.log('No token found, setting loading to false')
        setLoading(false)
        return
      }

      console.log('Checking application status...')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // Increased timeout

      const response = await fetch(`${getApiBase()}/api/affiliate/application-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      console.log('Application status response:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Application status data:', data)
        // Backend returns data directly, not wrapped in success property
        const status = data.status || 'not_submitted'
        setHasSubmittedApplication(status !== 'not_submitted')
        setApplicationStatus(status)
        
        if (status === 'approved') {
          await fetchAffiliateData(false)
          await fetchReferrals(1, 10)
          setLoading(false)
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to check application status:', error)
      
      // Handle different types of errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn('Application status check timed out')
        } else {
          console.error('Network or other error:', error.message)
        }
      }
      
      // Try to use saved status as fallback
      const savedStatus = localStorage.getItem('affiliateApplicationStatus')
      if (savedStatus) {
        console.log('Using saved application status:', savedStatus)
        setHasSubmittedApplication(true)
        setApplicationStatus(savedStatus as any)
      } else {
        console.log('No saved application status found')
      }
      
      setLoading(false)
    }
  }

  const fetchCommissionSettings = async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/affiliate/commission-settings`)
      const data = await response.json()
      
      if (response.ok && data.commission_percentage !== undefined) {
        setCommissionSettings(data)
        // Update affiliateData commission_rate if it exists
        setAffiliateData((prevData) => {
          if (prevData) {
            return {
              ...prevData,
              commission_rate: data.commission_percentage || prevData.commission_rate
            }
          }
          return prevData
        })
      }
    } catch (error) {
      console.error('Failed to fetch commission settings:', error)
    }
  }

  const fetchMarketingMaterials = async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/affiliate/marketing-materials`)
      const data = await response.json()
      
      if (response.ok) {
        setMarketingMaterials(data)
      }
    } catch (error) {
      console.error('Failed to fetch marketing materials:', error)
    }
  }

  const fetchNefolCoins = async () => {
    try {
      // Calculate nefol coins from total earnings: 1 rupee = 10 coins
      // So if earnings are ₹288.84, coins = 288.84 * 10 = 2888.4 ≈ 2888 coins (floor)
      if (affiliateData?.total_earnings) {
        const coinsFromEarnings = Math.floor(affiliateData.total_earnings * 10)
        setNefolCoins(coinsFromEarnings)
        console.log('Nefol coins calculated from earnings:', coinsFromEarnings, 'from ₹', affiliateData.total_earnings)
      } else {
        // Fallback: fetch from API if earnings not available
        const token = localStorage.getItem('token')
        if (!token) {
          console.log('No token found, skipping Nefol coins fetch')
          return
        }

        const response = await fetch(`${getApiBase()}/api/nefol-coins`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setNefolCoins(data.nefol_coins || 0)
          console.log('Nefol coins fetched successfully:', data.nefol_coins)
        } else {
          console.log('Nefol coins API returned:', response.status, response.statusText)
        }
      }
    } catch (error) {
      console.error('Failed to fetch/calculate Nefol coins:', error)
      // Don't throw error, just log it and continue
    }
  }

  const fetchAffiliateData = async (shouldSetLoading = true) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        if (shouldSetLoading) setLoading(false)
        return
      }

      console.log('Fetching affiliate dashboard data...')
      const response = await fetch(`${getApiBase()}/api/affiliate/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Dashboard API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Dashboard API response data:', data)
        
        // Backend returns data directly, not wrapped in success property
        setAffiliateData(data)
        console.log('Affiliate data fetched successfully:', data)
        console.log('Referral link in response:', data.referral_link)
        
        // Update nefol coins based on earnings (1 rupee = 10 coins)
        if (data.total_earnings) {
          const coinsFromEarnings = Math.floor(data.total_earnings * 10)
          setNefolCoins(coinsFromEarnings)
        }
        
        // Check if user is already verified
        if (data.status === 'active' || data.is_verified) {
          setIsAlreadyVerified(true)
          console.log('User is verified, showing dashboard')
          // Fetch referrals with pagination when user is verified
          await fetchReferrals(1, 10)
        } else {
          setIsAlreadyVerified(false)
          console.log('User is not verified, showing verification form')
          // Update referrals from recent_referrals if available (for non-verified users)
          if (data.recent_referrals && Array.isArray(data.recent_referrals)) {
            setReferrals(data.recent_referrals)
          }
        }
      } else if (response.status === 404) {
        console.log('No affiliate account found - this is normal for new users')
        setIsAlreadyVerified(false)
      } else {
        console.error('Failed to fetch affiliate data:', response.status)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error response:', errorData)
        setIsAlreadyVerified(false)
      }
    } catch (error) {
      console.error('Failed to fetch affiliate data:', error)
    } finally {
      if (shouldSetLoading) setLoading(false)
    }
  }

  const fetchReferrals = async (page: number = 1, limit: number = 10) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      setReferralsLoading(true)
      const response = await fetch(`${getApiBase()}/api/affiliate/referrals?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Backend returns data with referrals and pagination
        if (data.referrals && data.pagination) {
          setReferrals(data.referrals)
          setReferralsPage(data.pagination.page)
          setReferralsTotalPages(data.pagination.pages)
          setReferralsTotal(data.pagination.total)
          console.log('Referrals fetched successfully:', data)
        } else {
          // Fallback for old response format
          setReferrals(data.referrals || data)
          setReferralsPage(1)
          setReferralsTotalPages(1)
          setReferralsTotal((data.referrals || data).length)
        }
      } else if (response.status === 404) {
        console.log('No referrals found - this is normal for new affiliates')
        setReferrals([])
        setReferralsPage(1)
        setReferralsTotalPages(1)
        setReferralsTotal(0)
      } else {
        console.error('Failed to fetch referrals:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch referrals:', error)
    } finally {
      setReferralsLoading(false)
    }
  }

  const handleCodeVerification = async () => {
    if (!verificationCode.trim()) {
      setVerificationMessage('Please enter a verification code')
      return
    }

    setIsVerifying(true)
    setVerificationMessage('')

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setVerificationMessage('No authentication token found')
        setIsVerifying(false)
        return
      }

      const response = await fetch(`${getApiBase()}/api/affiliate/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ verificationCode: verificationCode.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.message === 'Account already verified') {
          setVerificationMessage('Approved and Verified')
        } else {
          setVerificationMessage('Approved and Verified')
        }
        
        // Fetch updated affiliate data to show dashboard
        setTimeout(async () => {
          try {
            await fetchAffiliateData(false)
            await fetchReferrals(1, 10)
            setIsAlreadyVerified(true)
            setVerificationMessage('')
            setVerificationCode('')
            setShowCodeForm(false)
          } catch (error) {
            console.error('Failed to load dashboard after verification:', error)
            setVerificationMessage('Verification successful! Please refresh the page to see your dashboard.')
          }
        }, 1500)
      } else {
        if (data.message === 'This verification code has already been used by another account') {
          setVerificationMessage('This verification code has already been used by another account')
        } else {
          setVerificationMessage(data.message || 'Invalid verification code')
        }
      }
    } catch (error) {
      console.error('Verification error:', error)
      setVerificationMessage('Failed to verify code. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleApplyFromCollab = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!collabApplyTerms) {
      alert('Please agree to the terms and conditions.')
      return
    }
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('No authentication token found')
        return
      }
      setCollabApplySubmitting(true)
      const response = await fetch(`${getApiBase()}/api/affiliate/application-from-collab`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agreeTerms: true })
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setHasSubmittedApplication(true)
        setApplicationStatus('pending')
        localStorage.setItem('affiliateApplicationStatus', 'pending')
        setVerificationMessage('Your Application is pending for Approval')
        setCollabApplyTerms(false)
      } else if (response.status === 409) {
        const errorMessage = data.message || 'You have already submitted an application'
        alert(`${errorMessage} Please check your email for the verification code or contact support if you need assistance.`)
        setHasSubmittedApplication(true)
        setApplicationStatus('pending')
        setTimeout(() => checkApplicationStatus(), 1000)
      } else {
        alert(data.message || 'Failed to submit application. Please try again or contact support.')
      }
    } catch (error) {
      console.error('Application submission error:', error)
      alert('Failed to submit application. Please try again.')
    } finally {
      setCollabApplySubmitting(false)
    }
  }

  const copyReferralLink = () => {
    if (affiliateData?.referral_link) {
      // Check if clipboard API is available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(affiliateData.referral_link)
          .then(() => {
            setCopySuccess(true)
            setTimeout(() => setCopySuccess(false), 2000)
          })
          .catch((error) => {
            console.warn('Clipboard API failed, using fallback:', error)
            // Fallback for when clipboard API fails
            fallbackCopyToClipboard(affiliateData.referral_link)
          })
      } else {
        // Fallback for browsers that don't support clipboard API
        fallbackCopyToClipboard(affiliateData.referral_link)
      }
    }
  }

  const fallbackCopyToClipboard = (text: string) => {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } else {
        console.error('Fallback copy failed')
        // Show user-friendly message
        alert('Unable to copy to clipboard. Please copy the link manually.')
      }
    } catch (error) {
      console.error('Copy failed:', error)
      alert('Unable to copy to clipboard. Please copy the link manually.')
    }
  }

  const downloadMaterial = (file: any) => {
    if (file.type === 'folder') {
      // For folders, we'll show a modal with all files in that folder
      // For now, just open the folder URL
      window.open(`${getApiBase()}${file.url}`, '_blank')
    } else {
      // For individual files, download them
      const link = document.createElement('a')
      link.href = `${getApiBase()}${file.url}`
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  const downloadAllInCategory = (files: any[]) => {
    files.forEach((file, index) => {
      setTimeout(() => {
        downloadMaterial(file)
      }, index * 300) // Stagger downloads to avoid browser blocking
    })
  }

  const filterMaterials = (materials: any[], query: string) => {
    if (!query) return materials
    const lowerQuery = query.toLowerCase()
    return materials.filter((category: any) => {
      const nameMatch = category.name?.toLowerCase().includes(lowerQuery)
      const descMatch = category.description?.toLowerCase().includes(lowerQuery)
      const fileMatch = category.files?.some((file: any) => 
        file.name?.toLowerCase().includes(lowerQuery)
      )
      return nameMatch || descMatch || fileMatch
    })
  }

  const getMaterialTypeIcon = (type: string) => {
    switch (type) {
      case 'socialMediaPosts':
        return <Smartphone className="h-5 w-5" />
      case 'productImages':
        return <ImageIcon className="h-5 w-5" />
      case 'emailTemplates':
        return <Mail className="h-5 w-5" />
      case 'videos':
        return <Video className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <main className={mainEmbed} style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
        <style>{`
          :root {
            --arctic-blue-primary: rgb(75,151,201);
            --arctic-blue-primary-hover: rgb(60,120,160);
            --arctic-blue-primary-dark: rgb(50,100,140);
            --arctic-blue-light: #E0F5F5;
            --arctic-blue-lighter: #F0F9F9;
            --arctic-blue-background: #F4F9F9;
          }
        `}</style>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-gray-600 mb-2 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>Loading affiliate data...</p>
              <p className="text-sm text-gray-500 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>This may take a few moments</p>
              <div className="mt-6">
                <button 
                  onClick={() => setLoading(false)}
                  className="text-sm font-light tracking-wide hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--arctic-blue-primary-dark)', letterSpacing: '0.05em' }}
                >
                  Skip loading and continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // If user is verified and has affiliate data, show dashboard
  if (isAlreadyVerified && affiliateData) {
    return (
      <main className={mainEmbed} style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
        <style>{`
          :root {
            --arctic-blue-primary: rgb(75,151,201);
            --arctic-blue-primary-hover: rgb(60,120,160);
            --arctic-blue-primary-dark: rgb(50,100,140);
            --arctic-blue-light: #E0F5F5;
            --arctic-blue-lighter: #F0F9F9;
            --arctic-blue-background: #F4F9F9;
          }
        `}</style>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header with Back Button */}
          <div className="mb-8 sm:mb-12">
            {!embedInCreatorProgram && affiliateSource === 'profile' && (
  <button
    onClick={() => window.location.hash = '#/user/profile'}
    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6 font-light tracking-wide"
  >
    <ArrowLeft className="h-4 w-4" />
    <span>Back to Profile</span>
  </button>
)}

{!embedInCreatorProgram && affiliateSource === 'home' && (
  <button
    onClick={() => window.location.hash = '#/'}
    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6 font-light tracking-wide"
  >
    <ArrowLeft className="h-4 w-4" />
    <span>Back to Home</span>
  </button>
)}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 
                  className="text-3xl sm:text-4xl md:text-5xl font-light mb-3 tracking-[0.15em]" 
                  style={{
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-heading-family)',
                    letterSpacing: '0.15em'
                  }}
                >
                  Affiliate Partner Dashboard
                </h1>
                <p className="text-gray-600 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>Manage your affiliate program and track your earnings</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const dashboardContent = document.getElementById('dashboard-content')
                    if (dashboardContent) {
                      dashboardContent.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl transition-all duration-300 font-light tracking-wide uppercase flex items-center gap-2 text-xs sm:text-sm"
                  style={{ 
                    backgroundColor: 'var(--arctic-blue-primary)',
                    letterSpacing: '0.1em'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                  }}
                >
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </button>
                <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-light tracking-wide" style={{ backgroundColor: 'var(--arctic-blue-light)', color: 'var(--arctic-blue-primary-dark)', letterSpacing: '0.05em' }}>
                  <CheckCircle className="h-4 w-4" />
                  Verified
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Content */}
          <div id="dashboard-content">

            {/* ── Revenue Tab bar ─────────────────────────────────────────── */}
            <div className="flex gap-1 border-b border-gray-200 mb-8">
              {partnerDashboardRevTabs.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setRevTab(key)}
                  className={`border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors font-light tracking-wide ${
                    revTab === key ? 'border-[rgb(75,151,201)] text-[rgb(50,100,140)]' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`} style={{ letterSpacing: '0.05em' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── Overview tab ─────────────────────────────────────────────── */}
            {revTab === 'overview' && <>
            {/* Currency Selector */}
            <div className="mb-6 flex items-center gap-3">
              <p className="text-sm font-light tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>Currency:</p>
              <div className="flex gap-2">
                {[
                  { code: 'INR', symbol: '₹', flag: '🇮🇳', name: 'Indian Rupee' },
                  { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'US Dollar' },
                  { code: 'EUR', symbol: '€', flag: '🇪🇺', name: 'Euro' },
                  { code: 'RUB', symbol: '₽', flag: '🇷🇺', name: 'Russian Ruble' }
                ].map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => setSelectedCurrency(currency.code as 'INR' | 'USD' | 'EUR' | 'RUB')}
                    className={`px-4 py-2 rounded-lg border-2 transition-all duration-300 flex items-center gap-2 text-sm font-light tracking-wide ${
                      selectedCurrency === currency.code
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    style={{
                      color: selectedCurrency === currency.code ? 'rgb(75,151,201)' : '#666'
                    }}
                  >
                    <span className="text-lg">{currency.flag}</span>
                    <span>{currency.symbol}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8 sm:mb-12">
              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-light tracking-wide mb-2" style={{ color: 'var(--arctic-blue-primary-dark)', letterSpacing: '0.05em' }}>Total Earnings</p>
                    <p className="text-2xl sm:text-3xl font-light" style={{ color: '#1a1a1a' }}>
                      {selectedCurrency === 'INR' && '₹'}
                      {selectedCurrency === 'USD' && '$'}
                      {selectedCurrency === 'EUR' && '€'}
                      {selectedCurrency === 'RUB' && '₽'}
                      {(() => {
                        const earnings = affiliateData?.total_earnings || 0
                        // Simple conversion rates (you can update these with real-time rates)
                        const rates: Record<string, number> = {
                          INR: 1,
                          USD: 0.012,
                          EUR: 0.011,
                          RUB: 1.1
                        }
                        return (earnings * (rates[selectedCurrency] || 1)).toFixed(2)
                      })()}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                    {selectedCurrency === 'INR' && <IndianRupee className="h-6 w-6" style={{ color: 'var(--arctic-blue-primary-dark)' }} />}
                    {selectedCurrency !== 'INR' && (
                      <span className="text-2xl">
                        {selectedCurrency === 'USD' && '🇺🇸'}
                        {selectedCurrency === 'EUR' && '🇪🇺'}
                        {selectedCurrency === 'RUB' && '🇷🇺'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-light tracking-wide mb-2" style={{ color: 'var(--arctic-blue-primary-dark)', letterSpacing: '0.05em' }}>Total Referrals</p>
                    <p className="text-2xl sm:text-3xl font-light" style={{ color: '#1a1a1a' }}>{affiliateData?.total_referrals || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                    <Users className="h-6 w-6" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-light tracking-wide mb-2" style={{ color: 'var(--arctic-blue-primary-dark)', letterSpacing: '0.05em' }}>Conversion Rate</p>
                    <p className="text-2xl sm:text-3xl font-light" style={{ color: '#1a1a1a' }}>{(affiliateData?.conversion_rate || 0).toFixed(1)}%</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                    <TrendingUp className="h-6 w-6" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-light tracking-wide mb-2" style={{ color: 'var(--arctic-blue-primary-dark)', letterSpacing: '0.05em' }}>Commission Rate</p>
                    <p className="text-2xl sm:text-3xl font-light" style={{ color: '#1a1a1a' }}>
                      {(commissionSettings?.commission_percentage !== undefined 
                        ? commissionSettings.commission_percentage 
                        : affiliateData?.commission_rate) || 0}%
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                    <Award className="h-6 w-6" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-light tracking-wide mb-2" style={{ color: 'var(--arctic-blue-primary-dark)', letterSpacing: '0.05em' }}>Nefol Coins</p>
                    <p className="text-2xl sm:text-3xl font-light" style={{ color: '#1a1a1a' }}>
                      {affiliateData?.total_earnings ? Math.floor(affiliateData.total_earnings * 10) : nefolCoins}
                    </p>
                    <p className="text-xs font-light tracking-wide mt-1" style={{ color: '#999', letterSpacing: '0.05em' }}>1 rupee = 10 coins</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                    <Coins className="h-6 w-6" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                  </div>
                </div>
              </div>

            </div>

            {/* Membership ID / Affiliate ID Section */}
            {affiliateData?.partner_id && (
              <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-100 shadow-sm mb-8 sm:mb-12">
                <h2 
                  className="text-xl sm:text-2xl font-light mb-4 tracking-[0.15em]" 
                  style={{
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-heading-family)',
                    letterSpacing: '0.15em'
                  }}
                >
                  Membership ID
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <code className="text-lg sm:text-xl text-gray-900 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>
                      {affiliateData.partner_id}
                    </code>
                  </div>
                  <button
                    onClick={() => {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(affiliateData.partner_id || '')
                          .then(() => {
                            setCopySuccess(true)
                            setTimeout(() => setCopySuccess(false), 2000)
                          })
                      }
                    }}
                    className="px-4 sm:px-6 py-3 rounded-xl transition-all duration-300 font-light tracking-wide uppercase flex items-center justify-center gap-2 text-xs sm:text-sm text-white"
                    style={{ 
                      backgroundColor: 'var(--arctic-blue-primary)',
                      letterSpacing: '0.1em'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>
                  Your unique Affiliate Partner ID for tracking and support
                </p>
              </div>
            )}

            {/* Referral Link Section */}
            <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-100 shadow-sm mb-8 sm:mb-12">
              <h2 
                className="text-xl sm:text-2xl font-light mb-6 tracking-[0.15em]" 
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family)',
                  letterSpacing: '0.15em'
                }}
              >
                Your Referral Link
              </h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <code className="text-xs sm:text-sm text-gray-700 break-all font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>
                    {affiliateData?.referral_link || 'Loading...'}
                  </code>
                </div>
                <button
                  onClick={copyReferralLink}
                  className={`px-4 sm:px-6 py-3 rounded-xl transition-all duration-300 font-light tracking-wide uppercase flex items-center justify-center gap-2 text-xs sm:text-sm ${
                    copySuccess 
                      ? 'bg-green-500 text-white' 
                      : 'text-white'
                  }`}
                  style={copySuccess ? {} : { 
                    backgroundColor: 'var(--arctic-blue-primary)',
                    letterSpacing: '0.1em'
                  }}
                  onMouseEnter={(e) => {
                    if (!copySuccess) {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!copySuccess) {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                  {copySuccess ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            </>}

            {/* ── Referrals tab ─────────────────────────────────────────────── */}
            {revTab === 'referrals' && <>
            {/* Recent Referrals */}
            <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-100 shadow-sm mb-8 sm:mb-12">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 
                  className="text-xl sm:text-2xl font-light tracking-[0.15em]" 
                  style={{
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-heading-family)',
                    letterSpacing: '0.15em'
                  }}
                >
                  Recent Referrals
                </h2>
                {referralsTotal > 0 && (
                  <p className="text-sm font-light tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>
                    Showing {((referralsPage - 1) * 10) + 1}-{Math.min(referralsPage * 10, referralsTotal)} of {referralsTotal}
                  </p>
                )}
              </div>
              {referralsLoading ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>Loading referrals...</p>
                </div>
              ) : referrals.length > 0 ? (
                <>
                  <div className="space-y-3 sm:space-y-4 mb-6">
                    {referrals.map((referral) => {
                      // Get customer name (try customer_name first, then fallback to referred_user_name)
                      const customerName = referral.customer_name || referral.referred_user_name || 'Anonymous User'
                      // Get commission amount (try commission_earned first, then commission_amount)
                      const commissionAmount = referral.commission_earned || referral.commission_amount || 0
                      // Get order total
                      const orderTotal = referral.order_total || 0
                      // Get products from order items
                      let orderItems = []
                      if (referral.order_items) {
                        if (typeof referral.order_items === 'string') {
                          try {
                            orderItems = JSON.parse(referral.order_items)
                          } catch (e) {
                            console.error('Error parsing order_items:', e)
                            orderItems = []
                          }
                        } else if (Array.isArray(referral.order_items)) {
                          orderItems = referral.order_items
                        }
                      }
                      const productNames = orderItems.length > 0 
                        ? orderItems.map((item: any) => item.name || item.title || 'Product').join(', ')
                        : 'Products'
                      const referralDate = referral.referral_date || referral.created_at
                      
                      return (
                        <div key={referral.id} className="flex items-center justify-between p-4 sm:p-5 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all duration-300">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                              <span className="font-light text-sm sm:text-base" style={{ color: 'var(--arctic-blue-primary-dark)' }}>
                                {customerName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-light text-gray-900 truncate text-sm sm:text-base tracking-wide" style={{ letterSpacing: '0.05em' }}>
                                {customerName}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600 truncate font-light tracking-wide mt-1" title={productNames} style={{ letterSpacing: '0.05em' }}>
                                {productNames}
                              </p>
                              <p className="text-xs text-gray-500 font-light tracking-wide mt-1" style={{ letterSpacing: '0.05em' }}>
                                {new Date(referralDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="font-light text-green-600 text-base sm:text-lg tracking-wide" style={{ letterSpacing: '0.05em' }}>
                              {selectedCurrency === 'INR' && '₹'}
                              {selectedCurrency === 'USD' && '$'}
                              {selectedCurrency === 'EUR' && '€'}
                              {selectedCurrency === 'RUB' && '₽'}
                              {(() => {
                                const amount = typeof commissionAmount === 'number' ? commissionAmount : parseFloat(String(commissionAmount))
                                const rates: Record<string, number> = { INR: 1, USD: 0.012, EUR: 0.011, RUB: 1.1 }
                                return (amount * (rates[selectedCurrency] || 1)).toFixed(2)
                              })()}
                            </p>
                            <p className="text-xs text-gray-500 font-light tracking-wide mt-1" style={{ letterSpacing: '0.05em' }}>
                              Order: {selectedCurrency === 'INR' && '₹'}
                              {selectedCurrency === 'USD' && '$'}
                              {selectedCurrency === 'EUR' && '€'}
                              {selectedCurrency === 'RUB' && '₽'}
                              {(() => {
                                const total = typeof orderTotal === 'number' ? orderTotal : parseFloat(String(orderTotal))
                                const rates: Record<string, number> = { INR: 1, USD: 0.012, EUR: 0.011, RUB: 1.1 }
                                return (total * (rates[selectedCurrency] || 1)).toFixed(2)
                              })()}
                            </p>
                            <p className="text-xs text-gray-600 font-light capitalize mt-1 tracking-wide" style={{ letterSpacing: '0.05em' }}>
                              {referral.status}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Pagination Controls */}
                  {referralsTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                      <button
                        onClick={() => {
                          if (referralsPage > 1) {
                            fetchReferrals(referralsPage - 1, 10)
                          }
                        }}
                        disabled={referralsPage === 1 || referralsLoading}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-light tracking-wide text-sm"
                        style={{ letterSpacing: '0.05em' }}
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center gap-2">
                        {Array.from({ length: referralsTotalPages }, (_, i) => i + 1)
                          .filter(page => {
                            // Show first page, last page, current page, and pages around current
                            if (page === 1 || page === referralsTotalPages) return true
                            if (Math.abs(page - referralsPage) <= 1) return true
                            return false
                          })
                          .map((page, index, array) => {
                            // Add ellipsis if there's a gap
                            const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1
                            return (
                              <React.Fragment key={page}>
                                {showEllipsisBefore && (
                                  <span className="px-2 text-gray-500">...</span>
                                )}
                                <button
                                  onClick={() => fetchReferrals(page, 10)}
                                  disabled={referralsLoading}
                                  className={`px-3 py-2 rounded-xl transition-all duration-300 font-light text-sm tracking-wide ${
                                    referralsPage === page
                                      ? 'text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  style={referralsPage === page ? { 
                                    backgroundColor: 'var(--arctic-blue-primary)',
                                    letterSpacing: '0.05em'
                                  } : { letterSpacing: '0.05em' }}
                                  onMouseEnter={(e) => {
                                    if (referralsPage !== page) {
                                      e.currentTarget.style.backgroundColor = '#e5e7eb'
                                    } else {
                                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (referralsPage !== page) {
                                      e.currentTarget.style.backgroundColor = '#f3f4f6'
                                    } else {
                                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                                    }
                                  }}
                                >
                                  {page}
                                </button>
                              </React.Fragment>
                            )
                          })}
                      </div>
                      
                      <button
                        onClick={() => {
                          if (referralsPage < referralsTotalPages) {
                            fetchReferrals(referralsPage + 1, 10)
                          }
                        }}
                        disabled={referralsPage === referralsTotalPages || referralsLoading}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-light tracking-wide text-sm"
                        style={{ letterSpacing: '0.05em' }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-light tracking-wide mb-2" style={{ letterSpacing: '0.05em' }}>No referrals yet</p>
                  <p className="text-sm text-gray-500 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>Start sharing your referral link to earn commissions!</p>
                </div>
              )}
            </div>

            </>}

            {/* ── Payouts tab ───────────────────────────────────────────────── */}
            {revTab === 'payouts' && <>
            {/* Marketing Materials */}
            <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <h2 
                  className="text-xl sm:text-2xl font-light tracking-[0.15em]" 
                  style={{
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-heading-family)',
                    letterSpacing: '0.15em'
                  }}
                >
                  Marketing Materials
                </h2>
                <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 focus:border-transparent bg-white text-gray-900 font-light tracking-wide transition-all duration-300 text-sm"
                    style={{ 
                      paddingLeft: '3rem',
                      letterSpacing: '0.05em',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(125, 211, 211, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Material Type Tabs */}
              <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 pb-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveMaterialTab('all')}
                  className={`px-4 py-2 rounded-xl transition-all duration-300 font-light tracking-wide text-sm ${
                    activeMaterialTab === 'all' ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={activeMaterialTab === 'all' ? { 
                    backgroundColor: 'var(--arctic-blue-primary)',
                    letterSpacing: '0.05em'
                  } : { letterSpacing: '0.05em' }}
                  onMouseEnter={(e) => {
                    if (activeMaterialTab !== 'all') {
                      e.currentTarget.style.backgroundColor = '#e5e7eb'
                    } else {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeMaterialTab !== 'all') {
                      e.currentTarget.style.backgroundColor = '#f3f4f6'
                    } else {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                    }
                  }}
                >
                  All Materials
                </button>
                {marketingMaterials?.socialMediaPosts && (
                  <button
                    onClick={() => setActiveMaterialTab('social')}
                    className={`px-4 py-2 rounded-xl transition-all duration-300 font-light tracking-wide text-sm flex items-center gap-2 ${
                      activeMaterialTab === 'social' ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={activeMaterialTab === 'social' ? { 
                      backgroundColor: 'var(--arctic-blue-primary)',
                      letterSpacing: '0.05em'
                    } : { letterSpacing: '0.05em' }}
                  >
                    <Smartphone className="h-4 w-4" />
                    Social Media
                  </button>
                )}
                {marketingMaterials?.productImages && (
                  <button
                    onClick={() => setActiveMaterialTab('images')}
                    className={`px-4 py-2 rounded-xl transition-all duration-300 font-light tracking-wide text-sm flex items-center gap-2 ${
                      activeMaterialTab === 'images' ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={activeMaterialTab === 'images' ? { 
                      backgroundColor: 'var(--arctic-blue-primary)',
                      letterSpacing: '0.05em'
                    } : { letterSpacing: '0.05em' }}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Product Images
                  </button>
                )}
                {marketingMaterials?.emailTemplates && (
                  <button
                    onClick={() => setActiveMaterialTab('email')}
                    className={`px-4 py-2 rounded-xl transition-all duration-300 font-light tracking-wide text-sm flex items-center gap-2 ${
                      activeMaterialTab === 'email' ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={activeMaterialTab === 'email' ? { 
                      backgroundColor: 'var(--arctic-blue-primary)',
                      letterSpacing: '0.05em'
                    } : { letterSpacing: '0.05em' }}
                  >
                    <Mail className="h-4 w-4" />
                    Email Templates
                  </button>
                )}
                {marketingMaterials?.videos && (
                  <button
                    onClick={() => setActiveMaterialTab('videos')}
                    className={`px-4 py-2 rounded-xl transition-all duration-300 font-light tracking-wide text-sm flex items-center gap-2 ${
                      activeMaterialTab === 'videos' ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={activeMaterialTab === 'videos' ? { 
                      backgroundColor: 'var(--arctic-blue-primary)',
                      letterSpacing: '0.05em'
                    } : { letterSpacing: '0.05em' }}
                  >
                    <Video className="h-4 w-4" />
                    Videos
                  </button>
                )}
              </div>

              {/* Usage Tips */}
              <div className="mb-6 sm:mb-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-light text-blue-900 mb-2 text-sm sm:text-base tracking-wide" style={{ letterSpacing: '0.05em' }}>Usage Tips</h4>
                    <ul className="text-xs sm:text-sm text-blue-700 font-light space-y-1 tracking-wide" style={{ letterSpacing: '0.05em' }}>
                      <li>• Use high-quality product images in your posts for better engagement</li>
                      <li>• Include your referral link in all marketing materials</li>
                      <li>• Customize email templates with your personal touch</li>
                      <li>• Share before/after posts to showcase real results</li>
                      <li>• Use product videos to demonstrate features and benefits</li>
                    </ul>
                  </div>
                </div>
              </div>

              {marketingMaterials ? (
                <div className="space-y-8 sm:space-y-12">
                  {/* Social Media Posts */}
                  {(activeMaterialTab === 'all' || activeMaterialTab === 'social') && marketingMaterials.socialMediaPosts && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg sm:text-xl font-light text-gray-900 flex items-center gap-3 tracking-wide" style={{ letterSpacing: '0.1em' }}>
                          <Smartphone className="h-5 w-5" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                          Social Media Posts
                        </h3>
                        <span className="text-xs text-gray-500 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>
                          {marketingMaterials.socialMediaPosts.reduce((acc: number, cat: any) => acc + (cat.files?.length || 0), 0)} files
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {filterMaterials(marketingMaterials.socialMediaPosts, searchQuery).map((category: any) => {
                          const isExpanded = expandedCategories[category.id] !== false
                          return (
                            <div key={category.id} className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-100 hover:shadow-md transition-all duration-300">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-light text-gray-900 mb-1 text-base sm:text-lg tracking-wide flex items-center gap-2" style={{ letterSpacing: '0.05em' }}>
                                    {category.name}
                                    {category.files?.length > 0 && (
                                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--arctic-blue-light)', color: 'var(--arctic-blue-primary-dark)' }}>
                                        {category.files.length}
                                      </span>
                                    )}
                                  </h4>
                                  <p className="text-sm text-gray-600 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>{category.description}</p>
                                </div>
                                {category.files?.length > 0 && (
                                  <button
                                    onClick={() => toggleCategory(category.id)}
                                    className="ml-2 p-1 rounded-lg hover:bg-white transition-colors"
                                    style={{ color: 'var(--arctic-blue-primary-dark)' }}
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </button>
                                )}
                              </div>
                              {category.files?.length > 0 && (
                                <>
                                  {isExpanded && (
                                    <div className="space-y-2 mb-3">
                                      {category.files.map((file: any, index: number) => (
                                        <button
                                          key={index}
                                          onClick={() => downloadMaterial(file)}
                                          className="w-full text-left px-4 py-3 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300 text-sm font-light tracking-wide flex items-center justify-between group"
                                          style={{ letterSpacing: '0.05em' }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                                            e.currentTarget.style.backgroundColor = 'var(--arctic-blue-lighter)'
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#e5e7eb'
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                          }}
                                        >
                                          <span className="flex items-center gap-2">
                                            {file.name}
                                          </span>
                                          <Download className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {category.files.length > 1 && (
                                    <button
                                      onClick={() => downloadAllInCategory(category.files)}
                                      className="w-full px-4 py-2 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300 text-xs font-light tracking-wide flex items-center justify-center gap-2"
                                      style={{ 
                                        letterSpacing: '0.05em',
                                        color: 'var(--arctic-blue-primary-dark)'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                                        e.currentTarget.style.backgroundColor = 'var(--arctic-blue-lighter)'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e5e7eb'
                                        e.currentTarget.style.backgroundColor = '#ffffff'
                                      }}
                                    >
                                      <Download className="h-3 w-3" />
                                      Download All ({category.files.length} files)
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Product Images */}
                  {(activeMaterialTab === 'all' || activeMaterialTab === 'images') && marketingMaterials.productImages && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg sm:text-xl font-light text-gray-900 flex items-center gap-3 tracking-wide" style={{ letterSpacing: '0.1em' }}>
                          <ImageIcon className="h-5 w-5" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                          Product Images
                        </h3>
                        <span className="text-xs text-gray-500 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>
                          {marketingMaterials.productImages.reduce((acc: number, cat: any) => acc + (cat.files?.length || 0), 0)} files
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {filterMaterials(marketingMaterials.productImages, searchQuery).map((category: any) => {
                          const isExpanded = expandedCategories[category.id] !== false
                          return (
                            <div key={category.id} className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-100 hover:shadow-md transition-all duration-300">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-light text-gray-900 mb-1 text-base sm:text-lg tracking-wide flex items-center gap-2" style={{ letterSpacing: '0.05em' }}>
                                    {category.name}
                                    {category.files?.length > 0 && (
                                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--arctic-blue-light)', color: 'var(--arctic-blue-primary-dark)' }}>
                                        {category.files.length}
                                      </span>
                                    )}
                                  </h4>
                                  <p className="text-sm text-gray-600 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>{category.description}</p>
                                </div>
                                {category.files?.length > 0 && (
                                  <button
                                    onClick={() => toggleCategory(category.id)}
                                    className="ml-2 p-1 rounded-lg hover:bg-white transition-colors"
                                    style={{ color: 'var(--arctic-blue-primary-dark)' }}
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </button>
                                )}
                              </div>
                              {category.files?.length > 0 && (
                                <>
                                  {isExpanded && (
                                    <div className="space-y-2 mb-3">
                                      {category.files.map((file: any, index: number) => (
                                        <button
                                          key={index}
                                          onClick={() => downloadMaterial(file)}
                                          className="w-full text-left px-4 py-3 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300 text-sm font-light tracking-wide flex items-center justify-between group"
                                          style={{ letterSpacing: '0.05em' }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                                            e.currentTarget.style.backgroundColor = 'var(--arctic-blue-lighter)'
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#e5e7eb'
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                          }}
                                        >
                                          <span className="flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                                            {file.name}
                                          </span>
                                          <Download className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {category.files.length > 1 && (
                                    <button
                                      onClick={() => downloadAllInCategory(category.files)}
                                      className="w-full px-4 py-2 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300 text-xs font-light tracking-wide flex items-center justify-center gap-2"
                                      style={{ 
                                        letterSpacing: '0.05em',
                                        color: 'var(--arctic-blue-primary-dark)'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                                        e.currentTarget.style.backgroundColor = 'var(--arctic-blue-lighter)'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e5e7eb'
                                        e.currentTarget.style.backgroundColor = '#ffffff'
                                      }}
                                    >
                                      <Download className="h-3 w-3" />
                                      Download All ({category.files.length} files)
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Email Templates */}
                  {(activeMaterialTab === 'all' || activeMaterialTab === 'email') && marketingMaterials.emailTemplates && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg sm:text-xl font-light text-gray-900 flex items-center gap-3 tracking-wide" style={{ letterSpacing: '0.1em' }}>
                          <Mail className="h-5 w-5" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                          Email Templates
                        </h3>
                        <span className="text-xs text-gray-500 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>
                          {marketingMaterials.emailTemplates.reduce((acc: number, cat: any) => acc + (cat.files?.length || 0), 0)} files
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {filterMaterials(marketingMaterials.emailTemplates, searchQuery).map((category: any) => {
                          const isExpanded = expandedCategories[category.id] !== false
                          return (
                            <div key={category.id} className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-100 hover:shadow-md transition-all duration-300">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-light text-gray-900 mb-1 text-base sm:text-lg tracking-wide flex items-center gap-2" style={{ letterSpacing: '0.05em' }}>
                                    {category.name}
                                    {category.files?.length > 0 && (
                                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--arctic-blue-light)', color: 'var(--arctic-blue-primary-dark)' }}>
                                        {category.files.length}
                                      </span>
                                    )}
                                  </h4>
                                  <p className="text-sm text-gray-600 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>{category.description}</p>
                                </div>
                                {category.files?.length > 0 && (
                                  <button
                                    onClick={() => toggleCategory(category.id)}
                                    className="ml-2 p-1 rounded-lg hover:bg-white transition-colors"
                                    style={{ color: 'var(--arctic-blue-primary-dark)' }}
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </button>
                                )}
                              </div>
                              {category.files?.length > 0 && (
                                <>
                                  {isExpanded && (
                                    <div className="space-y-2 mb-3">
                                      {category.files.map((file: any, index: number) => (
                                        <button
                                          key={index}
                                          onClick={() => downloadMaterial(file)}
                                          className="w-full text-left px-4 py-3 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300 text-sm font-light tracking-wide flex items-center justify-between group"
                                          style={{ letterSpacing: '0.05em' }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                                            e.currentTarget.style.backgroundColor = 'var(--arctic-blue-lighter)'
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#e5e7eb'
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                          }}
                                        >
                                          <span className="flex items-center gap-2">
                                            {file.name}
                                          </span>
                                          <Download className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {category.files.length > 1 && (
                                    <button
                                      onClick={() => downloadAllInCategory(category.files)}
                                      className="w-full px-4 py-2 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300 text-xs font-light tracking-wide flex items-center justify-center gap-2"
                                      style={{ 
                                        letterSpacing: '0.05em',
                                        color: 'var(--arctic-blue-primary-dark)'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                                        e.currentTarget.style.backgroundColor = 'var(--arctic-blue-lighter)'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e5e7eb'
                                        e.currentTarget.style.backgroundColor = '#ffffff'
                                      }}
                                    >
                                      <Download className="h-3 w-3" />
                                      Download All ({category.files.length} files)
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Videos */}
                  {(activeMaterialTab === 'all' || activeMaterialTab === 'videos') && marketingMaterials.videos && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg sm:text-xl font-light text-gray-900 flex items-center gap-3 tracking-wide" style={{ letterSpacing: '0.1em' }}>
                          <Video className="h-5 w-5" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                          Product Videos
                        </h3>
                        <span className="text-xs text-gray-500 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>
                          {marketingMaterials.videos.reduce((acc: number, cat: any) => acc + (cat.files?.length || 0), 0)} files
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {filterMaterials(marketingMaterials.videos, searchQuery).map((category: any) => {
                          const isExpanded = expandedCategories[category.id] !== false
                          return (
                            <div key={category.id} className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-100 hover:shadow-md transition-all duration-300">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-light text-gray-900 mb-1 text-base sm:text-lg tracking-wide flex items-center gap-2" style={{ letterSpacing: '0.05em' }}>
                                    {category.name}
                                    {category.files?.length > 0 && (
                                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--arctic-blue-light)', color: 'var(--arctic-blue-primary-dark)' }}>
                                        {category.files.length}
                                      </span>
                                    )}
                                  </h4>
                                  <p className="text-sm text-gray-600 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>{category.description}</p>
                                </div>
                                {category.files?.length > 0 && (
                                  <button
                                    onClick={() => toggleCategory(category.id)}
                                    className="ml-2 p-1 rounded-lg hover:bg-white transition-colors"
                                    style={{ color: 'var(--arctic-blue-primary-dark)' }}
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </button>
                                )}
                              </div>
                              {category.files?.length > 0 && (
                                <>
                                  {isExpanded && (
                                    <div className="space-y-2 mb-3">
                                      {category.files.map((file: any, index: number) => (
                                        <button
                                          key={index}
                                          onClick={() => downloadMaterial(file)}
                                          className="w-full text-left px-4 py-3 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300 text-sm font-light tracking-wide flex items-center justify-between group"
                                          style={{ letterSpacing: '0.05em' }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                                            e.currentTarget.style.backgroundColor = 'var(--arctic-blue-lighter)'
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#e5e7eb'
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                          }}
                                        >
                                          <span className="flex items-center gap-2">
                                            <Video className="h-4 w-4" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                                            {file.name}
                                          </span>
                                          <Download className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {category.files.length > 1 && (
                                    <button
                                      onClick={() => downloadAllInCategory(category.files)}
                                      className="w-full px-4 py-2 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300 text-xs font-light tracking-wide flex items-center justify-center gap-2"
                                      style={{ 
                                        letterSpacing: '0.05em',
                                        color: 'var(--arctic-blue-primary-dark)'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                                        e.currentTarget.style.backgroundColor = 'var(--arctic-blue-lighter)'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e5e7eb'
                                        e.currentTarget.style.backgroundColor = '#ffffff'
                                      }}
                                    >
                                      <Download className="h-3 w-3" />
                                      Download All ({category.files.length} files)
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* No Results Message */}
                  {searchQuery && (
                    <div className="text-center py-12">
                      <p className="text-gray-600 font-light tracking-wide mb-2" style={{ letterSpacing: '0.05em' }}>No materials found matching "{searchQuery}"</p>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-sm font-light tracking-wide hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--arctic-blue-primary-dark)', letterSpacing: '0.05em' }}
                      >
                        Clear search
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>Loading marketing materials...</p>
                </div>
              )}
            </div>
            </>}
          </div>
        </div>
      </main>
    )
  }

  // Main affiliate partner page - show options for code entry or application
  return (
    <main className={mainEmbed} style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <style>{`
        :root {
          --arctic-blue-primary: rgb(75,151,201);
          --arctic-blue-primary-hover: rgb(60,120,160);
          --arctic-blue-primary-dark: rgb(50,100,140);
          --arctic-blue-light: #E0F5F5;
          --arctic-blue-lighter: #F0F9F9;
          --arctic-blue-background: #F4F9F9;
        }
      `}</style>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          {!embedInCreatorProgram && (
          <button 
            onClick={() => window.location.hash = '#/user/profile'}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6 font-light tracking-wide"
            style={{ letterSpacing: '0.05em' }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Profile</span>
          </button>
          )}
          <div className="text-center">
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 tracking-[0.15em]" 
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.15em'
              }}
            >
              Affiliate Partner Program
            </h1>
            <p className="text-gray-600 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>Join our affiliate program and start earning commissions</p>
          </div>
        </div>

        {/* Application Status Display */}
        {hasSubmittedApplication && (
          <div className="mb-8 sm:mb-12">
            <div className={`rounded-xl p-6 sm:p-8 border ${
              applicationStatus === 'approved' 
                ? 'bg-green-50 border-green-200' 
                : applicationStatus === 'pending'
                ? 'bg-[#f0f8fd] border-[#d6eaf8]'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                {applicationStatus === 'approved' ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : applicationStatus === 'pending' ? (
                  <Clock className="h-6 w-6" style={{ color: 'var(--arctic-blue-primary, #4B97C9)' }} />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600" />
                )}
                <h3 className={`text-lg sm:text-xl font-light tracking-wide ${
                  applicationStatus === 'approved' 
                    ? 'text-green-800' 
                    : applicationStatus === 'pending'
                    ? 'text-gray-800'
                    : 'text-red-800'
                }`} style={{ letterSpacing: '0.1em' }}>
                  {applicationStatus === 'approved' 
                    ? (isAlreadyVerified ? 'Application Approved & Verified!' : 'Application Approved!')
                    : applicationStatus === 'pending'
                    ? 'Application Under Review'
                    : 'Application Rejected'
                  }
                </h3>
              </div>
              <p className={`font-light tracking-wide ${
                applicationStatus === 'approved' 
                  ? 'text-green-700' 
                  : applicationStatus === 'pending'
                  ? 'text-gray-600'
                  : 'text-red-700'
              }`} style={{ letterSpacing: '0.05em' }}>
                {applicationStatus === 'approved' 
                  ? (isAlreadyVerified 
                      ? 'Approved and Verified'
                      : 'Your application has been approved! You can now verify your account with the code sent to your email.'
                    )
                  : applicationStatus === 'pending'
                  ? (verificationMessage || 'Your Application is pending for Approval')
                  : 'Your application was not approved. Please contact support for more information.'
                }
              </p>
              
              {applicationStatus === 'pending' && (
                <>
                  <div className="mt-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" style={{ color: 'var(--arctic-blue-primary, #4B97C9)' }} />
                    <span className="text-xs font-light tracking-wide text-gray-700" style={{ letterSpacing: '0.05em' }}>
                      Verification Pending
                    </span>
                  </div>
                  <div className="mt-4 p-4 rounded-xl border" style={{ backgroundColor: '#f0f8fd', borderColor: '#d6eaf8' }}>
                    <p className="text-sm font-light tracking-wide text-gray-700" style={{ letterSpacing: '0.05em' }}>
                      <strong className="font-medium">Need help?</strong> If you're having trouble finding your verification code or have questions about your application, please contact our support team.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Main Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Apply from Creator Collab — profile comes from collab; no separate form */}
          <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            {/* Achievement banner — shown when user has collab stats */}
            {collabStats && (collabStats.views > 0 || collabStats.likes > 0) && (
              <div
                className="px-6 py-4 flex items-center gap-4 border-b border-[#e8f4fb]"
                style={{ background: 'linear-gradient(135deg, #f4fafb 0%, #e8f4fb 100%)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/80"
                  style={{ backgroundColor: 'rgba(75, 151, 201, 0.12)' }}
                >
                  <Award className="h-4 w-4" style={{ color: 'var(--arctic-blue-primary, #4B97C9)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Creator Collab Achievement</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                      <Eye className="h-3 w-3" style={{ color: 'var(--arctic-blue-primary, #4B97C9)' }} />{collabStats.views.toLocaleString()} views
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                      <Heart className="h-3 w-3" style={{ color: 'var(--arctic-blue-primary, #4B97C9)' }} />{collabStats.likes.toLocaleString()} likes
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <UserPlus className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
              </div>
              <h3 className="text-xl sm:text-2xl font-light text-gray-900 mb-3 tracking-[0.15em]" style={{ fontFamily: 'var(--font-heading-family)', letterSpacing: '0.15em' }}>
                Apply for partnership
              </h3>
              <p className="text-gray-600 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>
                After Creator Collab milestones, apply in one step. We use your collab profile and linked accounts—no duplicate form.
              </p>
            </div>

            {collabEligibleLoading ? (
              <p className="text-center text-gray-500 font-light text-sm" style={{ letterSpacing: '0.05em' }}>
                Checking your Creator Collab progress…
              </p>
            ) : hasSubmittedApplication ? (
              <button
                type="button"
                disabled
                className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-green-500 text-white rounded-xl transition-all duration-300 font-light tracking-wide uppercase text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ letterSpacing: '0.1em' }}
              >
                Application submitted
              </button>
            ) : !collabEligible ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center font-light" style={{ letterSpacing: '0.05em' }}>
                  Reach the Creator Collab thresholds (10,000+ views and 500+ likes on eligible reels) to unlock affiliate application here.
                </p>
                <a
                  href="#/user/collab"
                  className="block w-full text-center px-4 sm:px-6 py-3 sm:py-4 rounded-xl transition-all duration-300 font-light tracking-wide uppercase text-xs sm:text-sm border-2 border-gray-200 text-gray-800 hover:bg-gray-50"
                  style={{ letterSpacing: '0.1em' }}
                >
                  Go to Creator Collab
                </a>
              </div>
            ) : (
              <form onSubmit={handleApplyFromCollab} className="space-y-4">
                <p className="text-sm text-gray-600 font-light" style={{ letterSpacing: '0.05em' }}>
                  By submitting, you confirm that your name, contact, and social details from your Creator Collab application may be used for this affiliate application.
                </p>
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="affiliate-collab-terms"
                    checked={collabApplyTerms}
                    onChange={(e) => setCollabApplyTerms(e.target.checked)}
                    required
                    className="mt-1 mr-3 w-5 h-5 bg-white border-2 border-black rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    style={{ accentColor: '#4b97c9' }}
                  />
                  <label htmlFor="affiliate-collab-terms" className="text-sm font-light text-gray-700 tracking-wide cursor-pointer" style={{ letterSpacing: '0.05em' }}>
                    I agree to the terms and conditions *
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!collabApplyTerms || collabApplySubmitting}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 text-white rounded-xl transition-all duration-300 font-light tracking-wide uppercase text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'var(--arctic-blue-primary)',
                    letterSpacing: '0.1em'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                    }
                  }}
                >
                  {collabApplySubmitting ? 'Submitting…' : 'Submit application'}
                </button>
              </form>
            )}
            </div>{/* end p-6 sm:p-8 inner padding */}
          </div>

          {/* Code Verification Option */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Key className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: 'var(--arctic-blue-primary-dark)' }} />
              </div>
              <h3 className="text-xl sm:text-2xl font-light text-gray-900 mb-3 tracking-[0.15em]" style={{ fontFamily: 'var(--font-heading-family)', letterSpacing: '0.15em' }}>Verification Code</h3>
              <p className="text-gray-600 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>Enter your 20-character verification code</p>
            </div>

            {!showCodeForm ? (
              <button
                onClick={() => {
                  if (isAlreadyVerified) {
                    // If already verified, redirect to dashboard
                    window.location.reload()
                  } else {
                    setShowCodeForm(true)
                  }
                }}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-300 font-light tracking-wide uppercase text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ letterSpacing: '0.1em' }}
              >
                Enter Verification Code
              </button>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleCodeVerification(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-light text-gray-700 mb-2 tracking-wide" style={{ letterSpacing: '0.05em' }}>
                    Verification Code (20 characters) *
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      // Allow only alphanumeric characters and limit to 20 characters
                      const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
                      setVerificationCode(value)
                    }}
                    placeholder="Enter 20-character verification code"
                    maxLength={20}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 focus:border-transparent bg-white text-gray-900 font-light tracking-wide transition-all duration-300 text-center text-lg"
                    style={{ 
                      letterSpacing: '0.2em',
                      fontFamily: 'monospace'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--arctic-blue-primary)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(125, 211, 211, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-2 font-light tracking-wide text-center" style={{ letterSpacing: '0.05em' }}>
                    Enter the 20-digit code you received via email
                  </p>
                </div>

                {verificationMessage && (
                  <div className={`p-3 rounded-lg text-sm font-light tracking-wide ${verificationMessage.includes('Approved') || verificationMessage.includes('Verified') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`} style={{ letterSpacing: '0.05em' }}>
                    {verificationMessage}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isVerifying || !verificationCode.trim() || verificationCode.length !== 20}
                    className="flex-1 px-4 sm:px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-300 font-light tracking-wide uppercase text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ letterSpacing: '0.1em' }}
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCodeForm(false)
                      setVerificationCode('')
                      setVerificationMessage('')
                    }}
                    className="px-4 sm:px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-300 font-light tracking-wide text-xs sm:text-sm"
                    style={{ letterSpacing: '0.05em' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-100 shadow-sm">
          <h3 
            className="text-xl sm:text-2xl font-light text-gray-900 mb-8 tracking-[0.15em]" 
            style={{
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Why Join Our Affiliate Program?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <IndianRupee className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" style={{ color: 'var(--arctic-blue-primary-dark)' }} aria-hidden="true" />
              </div>
              <h4 className="font-light text-gray-900 mb-3 text-base sm:text-lg tracking-wide" style={{ letterSpacing: '0.1em' }}>High Commissions</h4>
              <p className="text-sm text-gray-600 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>Earn up to 30% commission on every sale you refer</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" style={{ color: 'var(--arctic-blue-primary-dark)' }} aria-hidden="true" />
              </div>
              <h4 className="font-light text-gray-900 mb-3 text-base sm:text-lg tracking-wide" style={{ letterSpacing: '0.1em' }}>Real-time Tracking</h4>
              <p className="text-sm text-gray-600 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>Track your referrals and earnings in real-time</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Award className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" style={{ color: 'var(--arctic-blue-primary-dark)' }} aria-hidden="true" />
              </div>
              <h4 className="font-light text-gray-900 mb-3 text-base sm:text-lg tracking-wide" style={{ letterSpacing: '0.1em' }}>Marketing Support</h4>
              <p className="text-sm text-gray-600 font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>Get access to marketing materials and support</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default AffiliatePartner