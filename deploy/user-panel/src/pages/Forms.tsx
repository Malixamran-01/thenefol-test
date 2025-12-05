import React, { useState, useEffect } from 'react'
import { FileText, CheckCircle, X, Star } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getApiBase } from '../utils/apiBase'

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'number' | 'file' | 'rating'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
    min?: number
    max?: number
  }
  settings?: {
    multiple?: boolean
    accept?: string
    maxSize?: number
  }
}

interface Form {
  id: number
  name: string
  fields: FormField[]
  status: 'active' | 'draft'
  submission_count?: number
  created_at?: string
}

export default function Forms() {
  const { user } = useAuth()
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    fetchForms()
  }, [])

  const fetchForms = async () => {
    try {
      setLoading(true)
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/forms`)
      if (response.ok) {
        const data = await response.json()
        const formsData = data.forms || data || []
        // Filter only published (active) forms
        const publishedForms = formsData
          .filter((form: any) => form.status === 'active')
          .map((form: any) => ({
            ...form,
            fields: typeof form.fields === 'string' ? JSON.parse(form.fields) : (form.fields || [])
          }))
        setForms(publishedForms)
      }
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData({
      ...formData,
      [fieldId]: value
    })
  }

  const validateForm = (): boolean => {
    if (!selectedForm) return false
    
    for (const field of selectedForm.fields) {
      if (field.required) {
        const value = formData[field.id]
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          setSubmitError(`Please fill in the required field: ${field.label}`)
          return false
        }
      }
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess(false)

    if (!selectedForm) return

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      // Prepare submission data with user info if available
      const submissionData = {
        ...formData,
        ...(user?.email && { email: user.email }),
        ...(user?.name && { name: user.name })
      }

      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/forms/${selectedForm.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: submissionData,
          userEmail: user?.email || '',
          userName: user?.name || ''
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form')
      }

      setSubmitSuccess(true)
      setFormData({})
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setSelectedForm(null)
        setSubmitSuccess(false)
        setFormData({})
      }, 3000)
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit form. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (field: FormField) => {
    const value = formData[field.id] || ''

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={field.type === 'phone' ? 'tel' : field.type}
            id={field.id}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        )

      case 'textarea':
        return (
          <textarea
            id={field.id}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        )

      case 'select':
        return (
          <select
            id={field.id}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select an option</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={field.id}
              checked={!!value}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              required={field.required}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={field.id} className="text-sm text-gray-700 dark:text-gray-300">
              {field.label}
            </label>
          </div>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${field.id}-${index}`}
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor={`${field.id}-${index}`} className="text-sm text-gray-700 dark:text-gray-300">
                  {option}
                </label>
              </div>
            ))}
          </div>
        )

      case 'date':
        return (
          <input
            type="date"
            id={field.id}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        )

      case 'number':
        return (
          <input
            type="number"
            id={field.id}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        )

      case 'file':
        return (
          <input
            type="file"
            id={field.id}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                handleFieldChange(field.id, file.name)
              }
            }}
            required={field.required}
            accept={field.settings?.accept}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        )

      case 'rating':
        return (
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleFieldChange(field.id, star)}
                className={`${
                  value >= star
                    ? 'text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                } hover:text-yellow-400 transition-colors`}
              >
                <Star className="h-8 w-8 fill-current" />
              </button>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
          </div>
        </div>
      </div>
    )
  }

  if (selectedForm) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => {
              setSelectedForm(null)
              setFormData({})
              setSubmitSuccess(false)
              setSubmitError('')
            }}
            className="mb-6 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5 mr-2" />
            Back to Forms
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {selectedForm.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Please fill out all required fields marked with *
            </p>

            {submitSuccess && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                  <p className="text-green-800 dark:text-green-300">
                    Form submitted successfully! Thank you for your response.
                  </p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-300">{submitError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {selectedForm.fields?.map((field) => (
                <div key={field.id}>
                  <label
                    htmlFor={field.id}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  {renderField(field)}
                </div>
              ))}

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedForm(null)
                    setFormData({})
                    setSubmitSuccess(false)
                    setSubmitError('')
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Forms
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Fill out our forms to share your feedback, inquiries, and more
          </p>
        </div>

        {forms.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No forms available
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              There are no published forms at the moment. Please check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div
                key={form.id}
                onClick={() => setSelectedForm(form)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  {form.submission_count !== undefined && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {form.submission_count} submissions
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {form.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {form.fields?.length || 0} fields
                </p>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Fill Form
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

