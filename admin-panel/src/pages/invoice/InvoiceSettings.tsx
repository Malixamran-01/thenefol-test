import React, { useState, useEffect } from 'react'
import { Settings, Save, Eye, Palette, FileText, Building2, Users, Receipt, Upload, X, Image as ImageIcon } from 'lucide-react'
import { uploadFile } from '../../utils/upload'

interface CompanyDetails {
  companyName: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  gstNumber: string
  panNumber: string
  bankName: string
  accountNumber: string
  ifscCode: string
}

interface InvoiceSettings {
  companyDetails: CompanyDetails
  colors: {
    primaryStart: string
    primaryEnd: string
    accentStart: string
    accentEnd: string
  }
  tax: {
    rate: number
    type: 'IGST' | 'CGST+SGST'
  }
  terms: string
  signatureText: string
  currency: string
  logoUrl?: string
  signatoryPhotoUrl?: string
}

const InvoiceSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<InvoiceSettings>({
    companyDetails: {
      companyName: 'Nefol',
      companyAddress: '',
      companyPhone: '7355384939',
      companyEmail: 'info@nefol.com',
      gstNumber: '',
      panNumber: '',
      bankName: '',
      accountNumber: '',
      ifscCode: ''
    },
    colors: {
      primaryStart: '#667eea',
      primaryEnd: '#764ba2',
      accentStart: '#667eea',
      accentEnd: '#764ba2'
    },
    tax: {
      rate: 18,
      type: 'IGST'
    },
    terms: 'Thank you for doing business with us.',
    signatureText: 'Authorized Signatory',
    currency: '₹'
  })

  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [showPreview, setShowPreview] = useState(false)
  const [activeTab, setActiveTab] = useState<'company' | 'design' | 'tax' | 'terms'>('company')
  const [showImageModal, setShowImageModal] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingSignatory, setUploadingSignatory] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [signatoryPreview, setSignatoryPreview] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const getApiBase = () => {
        if ((import.meta as any).env.VITE_API_URL) return (import.meta as any).env.VITE_API_URL
        const host = (import.meta as any).env.VITE_BACKEND_HOST || (import.meta as any).env.VITE_API_HOST || 'localhost'
        const port = (import.meta as any).env.VITE_BACKEND_PORT || (import.meta as any).env.VITE_API_PORT || '4000'
        return `http://${host}:${port}`
      }
      const apiBase = getApiBase()
      
      // Load company details
      const detailsResponse = await fetch(`${apiBase}/api/invoice-settings/company-details`)
      if (detailsResponse.ok) {
        const data = await detailsResponse.json()
        if (data && Object.keys(data).length > 0) {
          setSettings(prev => ({
            ...prev,
            companyDetails: { 
              companyName: data.companyName || prev.companyDetails.companyName || '',
              companyAddress: data.companyAddress || prev.companyDetails.companyAddress || '',
              companyPhone: data.companyPhone || prev.companyDetails.companyPhone || '',
              companyEmail: data.companyEmail || prev.companyDetails.companyEmail || '',
              gstNumber: data.gstNumber || prev.companyDetails.gstNumber || '',
              panNumber: data.panNumber || prev.companyDetails.panNumber || '',
              bankName: data.bankName || prev.companyDetails.bankName || '',
              accountNumber: data.accountNumber || prev.companyDetails.accountNumber || '',
              ifscCode: data.ifscCode || prev.companyDetails.ifscCode || ''
            }
          }))
        }
      }

      // Load other settings
      const settingsResponse = await fetch(`${apiBase}/api/invoice-settings/all`)
      if (settingsResponse.ok) {
        const data = await settingsResponse.json()
        if (data) {
          setSettings(prev => ({ 
            ...prev, 
            ...(data.colors && { colors: data.colors }),
            ...(data.tax && { tax: data.tax }),
            ...(data.terms !== undefined && { terms: data.terms || '' }),
            ...(data.signatureText !== undefined && { signatureText: data.signatureText || '' }),
            ...(data.currency !== undefined && { currency: data.currency || '₹' }),
            ...(data.companyDetails && {
              companyDetails: {
                companyName: data.companyDetails.companyName || prev.companyDetails.companyName || '',
                companyAddress: data.companyDetails.companyAddress || prev.companyDetails.companyAddress || '',
                companyPhone: data.companyDetails.companyPhone || prev.companyDetails.companyPhone || '',
                companyEmail: data.companyDetails.companyEmail || prev.companyDetails.companyEmail || '',
                gstNumber: data.companyDetails.gstNumber || prev.companyDetails.gstNumber || '',
                panNumber: data.companyDetails.panNumber || prev.companyDetails.panNumber || '',
                bankName: data.companyDetails.bankName || prev.companyDetails.bankName || '',
                accountNumber: data.companyDetails.accountNumber || prev.companyDetails.accountNumber || '',
                ifscCode: data.companyDetails.ifscCode || prev.companyDetails.ifscCode || ''
              }
            }),
            ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || undefined }),
            ...(data.signatoryPhotoUrl !== undefined && { signatoryPhotoUrl: data.signatoryPhotoUrl || undefined })
          }))
          // Set previews if images exist
          if (data.logoUrl) {
            const logoUrl = data.logoUrl.startsWith('http') ? data.logoUrl : `${apiBase}${data.logoUrl}`
            setLogoPreview(logoUrl)
          }
          if (data.signatoryPhotoUrl) {
            const signatoryUrl = data.signatoryPhotoUrl.startsWith('http') ? data.signatoryPhotoUrl : `${apiBase}${data.signatoryPhotoUrl}`
            setSignatoryPreview(signatoryUrl)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setSaveStatus('idle')

    try {
      const getApiBase = () => {
        if ((import.meta as any).env.VITE_API_URL) return (import.meta as any).env.VITE_API_URL
        const host = (import.meta as any).env.VITE_BACKEND_HOST || (import.meta as any).env.VITE_API_HOST || 'localhost'
        const port = (import.meta as any).env.VITE_BACKEND_PORT || (import.meta as any).env.VITE_API_PORT || '4000'
        return `http://${host}:${port}`
      }
      const apiBase = getApiBase()
      
      // Save company details
      await fetch(`${apiBase}/api/invoice-settings/company-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings.companyDetails)
      })

      // Save all settings (including images)
      await fetch(`${apiBase}/api/invoice-settings/all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          logoUrl: settings.logoUrl,
          signatoryPhotoUrl: settings.signatoryPhotoUrl
        })
      })

      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setLoading(false)
    }
  }

  const updateNestedState = (section: string, field: string, value: any) => {
    setSettings(prev => {
      const newState = { ...prev }
      
      if (section === 'companyDetails' || section === 'colors' || section === 'tax') {
        newState[section as keyof InvoiceSettings] = {
          ...(prev[section as keyof InvoiceSettings] as any),
          [field]: value
        } as any
      } else {
        // Handle other fields like 'terms', 'signatureText', 'currency'
        newState[field as keyof InvoiceSettings] = value as any
      }
      
      return newState
    })
  }
  
  const updateSettings = (field: keyof InvoiceSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const generatePreviewStyle = () => {
    return {
      background: `linear-gradient(135deg, ${settings.colors.primaryStart} 0%, ${settings.colors.primaryEnd} 100%)`,
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px'
    }
  }

  const getApiBase = () => {
    if ((import.meta as any).env.VITE_API_URL) return (import.meta as any).env.VITE_API_URL
    const host = (import.meta as any).env.VITE_BACKEND_HOST || (import.meta as any).env.VITE_API_HOST || 'localhost'
    const port = (import.meta as any).env.VITE_BACKEND_PORT || (import.meta as any).env.VITE_API_PORT || '4000'
    return `http://${host}:${port}`
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    try {
      setUploadingLogo(true)
      const apiBase = getApiBase()
      const absoluteUrl = await uploadFile(file, apiBase)
      const relativePath = absoluteUrl.replace(/^https?:\/\/[^/]+/, '')
      
      setSettings(prev => ({ ...prev, logoUrl: relativePath }))
      setLogoPreview(absoluteUrl)
    } catch (error) {
      console.error('Failed to upload logo:', error)
      alert('Failed to upload logo. Please try again.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSignatoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    try {
      setUploadingSignatory(true)
      const apiBase = getApiBase()
      const absoluteUrl = await uploadFile(file, apiBase)
      const relativePath = absoluteUrl.replace(/^https?:\/\/[^/]+/, '')
      
      setSettings(prev => ({ ...prev, signatoryPhotoUrl: relativePath }))
      setSignatoryPreview(absoluteUrl)
    } catch (error) {
      console.error('Failed to upload signatory photo:', error)
      alert('Failed to upload signatory photo. Please try again.')
    } finally {
      setUploadingSignatory(false)
    }
  }

  const handleRemoveLogo = () => {
    setSettings(prev => ({ ...prev, logoUrl: undefined }))
    setLogoPreview(null)
  }

  const handleRemoveSignatory = () => {
    setSettings(prev => ({ ...prev, signatoryPhotoUrl: undefined }))
    setSignatoryPreview(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-primary">Invoice Settings</h1>
          <p className="text-gray-600 mt-1">Customize your invoice design and details</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImageModal(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <ImageIcon className="w-5 h-5" />
            Upload Images
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Eye className="w-5 h-5" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          ✓ All settings saved successfully!
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          ✗ Failed to save settings. Please try again.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['Company', 'Design', 'Tax', 'Terms'].map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase().replace('tax', 'tax').replace('terms', 'terms').replace('company', 'company').replace('design', 'design') as any)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === (tab === 'Company' ? 'company' : tab === 'Design' ? 'design' : tab === 'Tax' ? 'tax' : 'terms')
                ? 'border-b-2 border-brand-primary text-brand-primary'
                : 'text-gray-600 hover:text-brand-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        
        {/* Company Details Tab */}
        {activeTab === 'company' && (
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-6 h-6 text-brand-primary" />
              <h2 className="text-xl font-bold text-brand-primary">Company Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.companyDetails.companyName || ''}
                  onChange={(e) => updateNestedState('companyDetails', 'companyName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={settings.companyDetails.companyPhone || ''}
                  onChange={(e) => updateNestedState('companyDetails', 'companyPhone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={settings.companyDetails.companyEmail || ''}
                  onChange={(e) => updateNestedState('companyDetails', 'companyEmail', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                <input
                  type="text"
                  value={settings.companyDetails.gstNumber || ''}
                  onChange={(e) => updateNestedState('companyDetails', 'gstNumber', e.target.value)}
                  placeholder="29ABCDE1234F1Z5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
                <input
                  type="text"
                  value={settings.companyDetails.panNumber || ''}
                  onChange={(e) => updateNestedState('companyDetails', 'panNumber', e.target.value)}
                  placeholder="ABCDE1234F"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Complete Address <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={settings.companyDetails.companyAddress || ''}
                onChange={(e) => updateNestedState('companyDetails', 'companyAddress', e.target.value)}
                placeholder="Enter complete company address"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </div>

            {/* Banking Info */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Banking Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={settings.companyDetails.bankName || ''}
                    onChange={(e) => updateNestedState('companyDetails', 'bankName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                  <input
                    type="text"
                    value={settings.companyDetails.accountNumber || ''}
                    onChange={(e) => updateNestedState('companyDetails', 'accountNumber', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                  <input
                    type="text"
                    value={settings.companyDetails.ifscCode || ''}
                    onChange={(e) => updateNestedState('companyDetails', 'ifscCode', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Design Tab */}
        {activeTab === 'design' && (
          <div className="space-y-6">
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-6">
                <Palette className="w-6 h-6 text-brand-primary" />
                <h2 className="text-xl font-bold text-brand-primary">Color Customization</h2>
              </div>

              {/* Preview */}
              <div style={generatePreviewStyle()} className="mb-6">
                <h3 className="text-xl font-bold mb-2">Invoice Header Preview</h3>
                <p>This is how your invoice header will look</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Gradient Start
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={settings.colors.primaryStart}
                      onChange={(e) => updateNestedState('colors', 'primaryStart', e.target.value)}
                      className="w-20 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={settings.colors.primaryStart}
                      onChange={(e) => updateNestedState('colors', 'primaryStart', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Gradient End
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={settings.colors.primaryEnd}
                      onChange={(e) => updateNestedState('colors', 'primaryEnd', e.target.value)}
                      className="w-20 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={settings.colors.primaryEnd}
                      onChange={(e) => updateNestedState('colors', 'primaryEnd', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={settings.currency || ''}
                    onChange={(e) => updateSettings('currency', e.target.value)}
                    placeholder="₹"
                    maxLength={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
              </div>

              {/* Preset Colors */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Color Presets</h3>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { name: 'Arctic Blue', start: '#667eea', end: '#764ba2' },
                    { name: 'Ocean Blue', start: '#2193b0', end: '#6dd5ed' },
                    { name: 'Purple', start: '#9b59b6', end: '#e74c3c' },
                    { name: 'Green', start: '#11998e', end: '#38ef7d' },
                    { name: 'Orange', start: '#f12711', end: '#f5af19' },
                    { name: 'Pink', start: '#ec008c', end: '#fc6767' }
                  ].map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        updateNestedState('colors', 'primaryStart', preset.start)
                        updateNestedState('colors', 'primaryEnd', preset.end)
                      }}
                      className="px-4 py-2 rounded-lg border border-gray-300 hover:border-brand-primary transition-colors"
                      style={{ background: `linear-gradient(135deg, ${preset.start} 0%, ${preset.end} 100%)`, color: 'white' }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tax Tab */}
        {activeTab === 'tax' && (
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-6">
              <Receipt className="w-6 h-6 text-brand-primary" />
              <h2 className="text-xl font-bold text-brand-primary">Tax Settings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%)
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="range"
                    min="0"
                    max="28"
                    step="0.5"
                    value={settings.tax.rate}
                    onChange={(e) => updateNestedState('tax', 'rate', parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="font-bold text-brand-primary text-lg w-20 text-right">
                    {settings.tax.rate}%
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Type
                </label>
                <select
                  value={settings.tax.type}
                  onChange={(e) => updateNestedState('tax', 'type', e.target.value as 'IGST' | 'CGST+SGST')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                >
                  <option value="IGST">IGST (Inter-State)</option>
                  <option value="CGST+SGST">CGST + SGST (Intra-State)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Tax Calculation:</h4>
              <p className="text-sm text-blue-700">
                {settings.tax.type === 'IGST' 
                  ? `Your invoices will show ${settings.tax.rate}% IGST (Integrated GST) for inter-state sales.`
                  : `Your invoices will show ${settings.tax.rate / 2}% CGST and ${settings.tax.rate / 2}% SGST for intra-state sales.`
                }
              </p>
            </div>
          </div>
        )}

        {/* Terms Tab */}
        {activeTab === 'terms' && (
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-6 h-6 text-brand-primary" />
              <h2 className="text-xl font-bold text-brand-primary">Terms & Signature</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms and Conditions
                </label>
                <textarea
                  rows={6}
                  value={settings.terms || ''}
                  onChange={(e) => updateSettings('terms', e.target.value)}
                  placeholder="Enter your terms and conditions..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature Text
                </label>
                <input
                  type="text"
                  value={settings.signatureText || ''}
                  onChange={(e) => updateSettings('signatureText', e.target.value)}
                  placeholder="Authorized Signatory"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                />
              </div>

              {/* Preview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Preview:</h4>
                <p className="text-gray-700 mb-4">{settings.terms}</p>
                <div className="text-gray-600">
                  <div>For: {settings.companyDetails.companyName || 'Your Company'}</div>
                  <div className="mt-2">{settings.signatureText}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Final Save Button */}
      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary px-6 py-3 flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {/* Image Upload Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-brand-primary">Upload Invoice Images</h2>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Logo Upload */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Company Logo</h3>
                <div className="space-y-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="max-w-full h-32 object-contain border border-gray-200 rounded-lg p-2 bg-gray-50"
                      />
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">No logo uploaded</p>
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                        uploadingLogo
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-brand-primary text-white hover:bg-brand-secondary'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingLogo ? 'Uploading...' : logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Recommended: PNG or JPG, max 5MB. Transparent background preferred.
                    </p>
                  </div>
                </div>
              </div>

              {/* Signatory Photo Upload */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Authorized Signatory Photo</h3>
                <div className="space-y-4">
                  {signatoryPreview ? (
                    <div className="relative">
                      <img
                        src={signatoryPreview}
                        alt="Signatory preview"
                        className="max-w-full h-48 object-contain border border-gray-200 rounded-lg p-2 bg-gray-50"
                      />
                      <button
                        onClick={handleRemoveSignatory}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">No signatory photo uploaded</p>
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatoryUpload}
                      disabled={uploadingSignatory}
                      className="hidden"
                      id="signatory-upload"
                    />
                    <label
                      htmlFor="signatory-upload"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                        uploadingSignatory
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-brand-primary text-white hover:bg-brand-secondary'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingSignatory ? 'Uploading...' : signatoryPreview ? 'Change Photo' : 'Upload Photo'}
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Recommended: PNG or JPG, max 5MB. Clear signature or photo preferred.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  await handleSave()
                  setShowImageModal(false)
                }}
                disabled={loading}
                className="btn-primary px-6 py-2 flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Images
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvoiceSettingsPage
