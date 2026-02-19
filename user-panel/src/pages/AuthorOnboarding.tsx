import React, { useState, useEffect } from 'react'
import { Check, ChevronRight, Sparkles, User, BookOpen, Share2, Settings, Loader2, Upload, X } from 'lucide-react'
import { authorAPI } from '../services/authorAPI'
import { uploadAuthorProfileImage, uploadAuthorCoverImage } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getApiBase } from '../utils/apiBase'

interface OnboardingStep {
  number: number
  title: string
  icon: React.ReactNode
  completed: boolean
}

const AuthorOnboarding = () => {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Step 1 data
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [penName, setPenName] = useState('')
  const [realName, setRealName] = useState('')
  const [profileImage, setProfileImage] = useState('')
  const [coverImage, setCoverImage] = useState('')

  // Step 2 data
  const [bio, setBio] = useState('')
  const [writingCategories, setWritingCategories] = useState<string[]>([])
  const [writingLanguages, setWritingLanguages] = useState<string[]>([])
  const [location, setLocation] = useState('')

  // Step 3 data
  const [website, setWebsite] = useState('')
  const [twitter, setTwitter] = useState('')
  const [instagram, setInstagram] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [emailVisible, setEmailVisible] = useState(false)

  // Step 4 data
  const [allowComments, setAllowComments] = useState(true)
  const [allowSubscriptions, setAllowSubscriptions] = useState(true)
  const [allowPaidSubscriptions, setAllowPaidSubscriptions] = useState(false)
  const [showProducts, setShowProducts] = useState(false)

  const categories = ['Tech', 'Mental health', 'Diaries', 'Business', 'Poetry', 'Lifestyle', 'Health', 'Travel']
  const languages = ['English', 'Urdu', 'Hindi', 'Arabic', 'Spanish', 'French']
  const navigateToBlogRequest = () => {
    window.location.hash = '#/user/blog/request?new=1'
  }

  const steps: OnboardingStep[] = [
    { number: 1, title: 'Identity', icon: <User className="h-5 w-5" />, completed: currentStep > 1 },
    { number: 2, title: 'About', icon: <BookOpen className="h-5 w-5" />, completed: currentStep > 2 },
    { number: 3, title: 'Social', icon: <Share2 className="h-5 w-5" />, completed: currentStep > 3 },
    { number: 4, title: 'Preferences', icon: <Settings className="h-5 w-5" />, completed: currentStep > 4 },
    { number: 5, title: 'Complete', icon: <Check className="h-5 w-5" />, completed: currentStep > 5 }
  ]

  useEffect(() => {
    checkProgress()
  }, [])

  const checkProgress = async () => {
    try {
      const progress = await authorAPI.getProgress()
      if (progress.onboardingCompleted) {
        navigateToBlogRequest()
      } else if (progress.started) {
        setCurrentStep(progress.currentStep)
        const step1 = (progress as any).step1Data
        if (step1) {
          setUsername(step1.username || '')
          setDisplayName(step1.display_name || '')
          setPenName(step1.pen_name || '')
          setRealName(step1.real_name || '')
          setProfileImage(step1.profile_image || '')
          setCoverImage(step1.cover_image || '')
        }
      }
    } catch (err) {
      console.error('Failed to check progress:', err)
    }
  }

  const uploadProfilePic = async (file: File) => {
    const url = await uploadAuthorProfileImage(file)
    setProfileImage(url)
  }
  const uploadCoverPic = async (file: File) => {
    const url = await uploadAuthorCoverImage(file)
    setCoverImage(url)
  }

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !displayName) {
      setError('Username and display name are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      await authorAPI.submitStep1({
        username,
        display_name: displayName,
        pen_name: penName,
        real_name: realName,
        profile_image: profileImage || undefined,
        cover_image: coverImage || undefined
      })
      setCurrentStep(2)
      setSuccess('Step 1 completed!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save identity information')
    } finally {
      setLoading(false)
    }
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await authorAPI.submitStep2({
        bio,
        writing_categories: writingCategories,
        writing_languages: writingLanguages,
        location
      })
      setCurrentStep(3)
      setSuccess('Step 2 completed!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save about information')
    } finally {
      setLoading(false)
    }
  }

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await authorAPI.submitStep3({
        website,
        social_links: {
          twitter,
          instagram,
          linkedin
        },
        email_visible: emailVisible
      })
      setCurrentStep(4)
      setSuccess('Step 3 completed!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save social information')
    } finally {
      setLoading(false)
    }
  }

  const handleStep4 = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await authorAPI.submitStep4({
        preferences: {
          allow_comments: allowComments,
          allow_subscriptions: allowSubscriptions,
          allow_paid_subscriptions: allowPaidSubscriptions,
          show_products: showProducts
        }
      })
      setCurrentStep(5)
      setSuccess('Step 4 completed!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError('')

    try {
      await authorAPI.completeOnboarding()
      setSuccess('🎉 Your author profile is ready!')
      setTimeout(() => {
        navigateToBlogRequest()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (category: string) => {
    setWritingCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const toggleLanguage = (language: string) => {
    setWritingLanguages(prev =>
      prev.includes(language)
        ? prev.filter(l => l !== language)
        : [...prev, language]
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-gradient-to-r from-[#4B97C9] to-[#1B4965] p-3">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Become an Author</h1>
          <p className="text-gray-600">Complete your profile to start sharing your stories</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center">
                <div
                  className={`
                    flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all
                    ${step.completed || currentStep === step.number
                      ? 'border-[#4B97C9] bg-[#4B97C9] text-white'
                      : 'border-gray-300 bg-white text-gray-400'}
                  `}
                >
                  {step.completed ? <Check className="h-6 w-6" /> : step.icon}
                </div>
                <span className={`mt-2 text-xs font-medium ${currentStep === step.number ? 'text-[#4B97C9]' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${step.completed ? 'bg-[#4B97C9]' : 'bg-gray-300'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">
            {success}
          </div>
        )}

        {/* Form Content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          {/* Step 1: Identity */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Identity</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="@yourusername"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9] focus:ring-opacity-20"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">This will be your unique URL: @{username || 'yourusername'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9] focus:ring-opacity-20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pen Name (Optional)
                </label>
                <input
                  type="text"
                  value={penName}
                  onChange={(e) => setPenName(e.target.value)}
                  placeholder="J. Doe"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9] focus:ring-opacity-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Real Name (Private, Optional)
                </label>
                <input
                  type="text"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="Your real name (kept private)"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9] focus:ring-opacity-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture (Optional)
                </label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                    {profileImage ? (
                      <img src={profileImage.startsWith('/') ? `${getApiBase()}${profileImage}` : profileImage} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="profile-upload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          try {
                            await uploadProfilePic(file)
                          } catch (err: any) {
                            setError(err?.message || 'Failed to upload profile picture')
                          }
                        }
                      }}
                    />
                    <label htmlFor="profile-upload" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                      <Upload className="h-4 w-4" />
                      {profileImage ? 'Change' : 'Upload'}
                    </label>
                    {profileImage && (
                      <button type="button" onClick={() => setProfileImage('')} className="ml-2 text-sm text-red-600 hover:underline">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Picture (Optional)
                </label>
                <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 bg-gray-50">
                  {coverImage ? (
                    <div className="relative">
                      <img src={coverImage.startsWith('/') ? `${getApiBase()}${coverImage}` : coverImage} alt="Cover" className="w-full h-32 object-cover rounded-lg" />
                      <button type="button" onClick={() => setCoverImage('')} className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="cover-upload"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            try {
                              await uploadCoverPic(file)
                            } catch (err: any) {
                              setError(err?.message || 'Failed to upload cover picture')
                            }
                          }
                        }}
                      />
                      <label htmlFor="cover-upload" className="flex flex-col items-center gap-2 cursor-pointer text-gray-500 hover:text-gray-700">
                        <Upload className="h-8 w-8" />
                        <span className="text-sm font-medium">Upload cover image</span>
                      </label>
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4B97C9] to-[#1B4965] px-6 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: About */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About You</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell readers about yourself..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9] focus:ring-opacity-20"
                />
                <p className="mt-1 text-xs text-gray-500">Markdown supported</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Writing Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        writingCategories.includes(category)
                          ? 'bg-[#4B97C9] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Writing Languages
                </label>
                <div className="flex flex-wrap gap-2">
                  {languages.map(language => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => toggleLanguage(language)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        writingLanguages.includes(language)
                          ? 'bg-[#4B97C9] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {language}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Country"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9] focus:ring-opacity-20"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4B97C9] to-[#1B4965] px-6 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Social */}
          {currentStep === 3 && (
            <form onSubmit={handleStep3} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Social Presence</h2>
              <p className="text-gray-600 mb-6">Connect your social media (all optional)</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9] focus:ring-opacity-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Twitter/X
                </label>
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@yourusername"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9] focus:ring-opacity-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@yourusername"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9] focus:ring-opacity-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn
                </label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="username"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9] focus:ring-opacity-20"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="emailVisible"
                  checked={emailVisible}
                  onChange={(e) => setEmailVisible(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#4B97C9] focus:ring-[#4B97C9]"
                />
                <label htmlFor="emailVisible" className="text-sm text-gray-700">
                  Make my email visible on my author profile
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4B97C9] to-[#1B4965] px-6 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Preferences */}
          {currentStep === 4 && (
            <form onSubmit={handleStep4} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Preferences</h2>
              <p className="text-gray-600 mb-6">Choose how readers can interact with your content</p>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="allowComments"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#4B97C9] focus:ring-[#4B97C9]"
                  />
                  <div>
                    <label htmlFor="allowComments" className="font-medium text-gray-900 cursor-pointer">
                      Allow comments on my posts
                    </label>
                    <p className="text-sm text-gray-500">Readers can comment and discuss your posts</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="allowSubscriptions"
                    checked={allowSubscriptions}
                    onChange={(e) => setAllowSubscriptions(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#4B97C9] focus:ring-[#4B97C9]"
                  />
                  <div>
                    <label htmlFor="allowSubscriptions" className="font-medium text-gray-900 cursor-pointer">
                      Allow email subscriptions
                    </label>
                    <p className="text-sm text-gray-500">Let readers subscribe to get notified of new posts</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="allowPaidSubscriptions"
                    checked={allowPaidSubscriptions}
                    onChange={(e) => setAllowPaidSubscriptions(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#4B97C9] focus:ring-[#4B97C9]"
                  />
                  <div>
                    <label htmlFor="allowPaidSubscriptions" className="font-medium text-gray-900 cursor-pointer">
                      Enable paid subscriptions (coming soon)
                    </label>
                    <p className="text-sm text-gray-500">Offer premium content to paid subscribers</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="showProducts"
                    checked={showProducts}
                    onChange={(e) => setShowProducts(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#4B97C9] focus:ring-[#4B97C9]"
                  />
                  <div>
                    <label htmlFor="showProducts" className="font-medium text-gray-900 cursor-pointer">
                      Show my products on author page
                    </label>
                    <p className="text-sm text-gray-500">Display products you sell alongside your content</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4B97C9] to-[#1B4965] px-6 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-6">
                  <Check className="h-12 w-12 text-green-600" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h2>
                <p className="text-gray-600">
                  Your author profile is ready. Click below to activate it and start writing.
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-6 text-left space-y-3">
                <h3 className="font-semibold text-gray-900">What happens next:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>You'll get the AUTHOR role and access to writing tools</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Your author profile will be visible to readers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>You can start submitting blog posts for review</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Readers can follow and subscribe to you</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4B97C9] to-[#1B4965] px-6 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      Activate Author Profile
                      <Sparkles className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthorOnboarding
