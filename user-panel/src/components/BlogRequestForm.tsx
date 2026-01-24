import React, { useState, useEffect, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Bold, Italic, Underline, Link, List, ListOrdered } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'

interface BlogRequestFormProps {
  onClose: () => void
  onSubmitSuccess?: () => void
}

interface BlogRequest {
  title: string
  content: string
  excerpt: string
  author_name: string
  author_email: string
  images: File[]
}

export default function BlogRequestForm({ onClose, onSubmitSuccess }: BlogRequestFormProps) {
  const { user, isAuthenticated } = useAuth()
  const editorRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState<BlogRequest>({
    title: '',
    content: '',
    excerpt: '',
    author_name: '',
    author_email: '',
    images: []
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        author_name: user.name || '',
        author_email: user.email || ''
      }))
    }
  }, [isAuthenticated, user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleEditorInput = () => {
    if (editorRef.current) {
      setFormData(prev => ({
        ...prev,
        content: editorRef.current!.innerHTML
      }))
    }
  }

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    handleEditorInput()
  }

  const setHeading = (level: number) => {
    exec('formatBlock', `h${level}`)
  }

  const setParagraph = () => {
    exec('formatBlock', 'p')
  }

  const insertLink = () => {
    const url = prompt('Enter URL')
    if (url) exec('createLink', url)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData(prev => ({ ...prev, images: [...prev.images, ...files] }))
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreedToTerms) {
      setSubmitStatus('error')
      setErrorMessage('Please agree to the terms and conditions before submitting.')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const apiBase = getApiBase()
      const formDataToSend = new FormData()

      formDataToSend.append('title', formData.title)
      formDataToSend.append('content', formData.content)
      formDataToSend.append('excerpt', formData.excerpt)
      formDataToSend.append('author_name', formData.author_name)
      formDataToSend.append('author_email', formData.author_email)

      formData.images.forEach(image => {
        formDataToSend.append('images', image)
      })

      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${apiBase}/api/blog/request`, {
        method: 'POST',
        headers,
        body: formDataToSend
      })

      if (response.ok) {
        setSubmitStatus('success')
        setTimeout(() => {
          onSubmitSuccess?.()
          onClose()
        }, 2000)
      } else {
        const errorData = await response.json()
        setSubmitStatus('error')
        setErrorMessage(errorData.message || 'Failed to submit blog request')
      }
    } catch {
      setSubmitStatus('error')
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitStatus === 'success') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your blog post request has been submitted successfully.
          </p>
          <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-6">
          <h2 className="text-2xl font-bold">Submit Blog Post</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="author_name" value={formData.author_name} onChange={handleInputChange}
              className="border p-2 rounded" placeholder="Your Name" required disabled={isSubmitting} />
            <input name="author_email" value={formData.author_email} onChange={handleInputChange}
              className="border p-2 rounded" placeholder="Email" required disabled={isSubmitting} />
          </div>

          <input name="title" value={formData.title} onChange={handleInputChange}
            className="border p-2 rounded w-full" placeholder="Blog title" required />

          <textarea name="excerpt" value={formData.excerpt} onChange={handleInputChange}
            className="border p-2 rounded w-full" rows={3} placeholder="Short excerpt" required />

          {/* Toolbar */}
          <div className="border rounded-lg">
            <div className="flex flex-wrap gap-2 p-2 border-b bg-gray-50">
              <button type="button" onClick={setParagraph} className="px-2 py-1 border rounded">P</button>
              {[1,2,3,4].map(h => (
                <button key={h} type="button" onClick={() => setHeading(h)} className="px-2 py-1 border rounded">H{h}</button>
              ))}
              <button type="button" onClick={() => exec('bold')}><Bold size={16} /></button>
              <button type="button" onClick={() => exec('italic')}><Italic size={16} /></button>
              <button type="button" onClick={() => exec('underline')}><Underline size={16} /></button>
              <button type="button" onClick={insertLink}><Link size={16} /></button>
              <button type="button" onClick={() => exec('insertUnorderedList')}><List size={16} /></button>
              <button type="button" onClick={() => exec('insertOrderedList')}><ListOrdered size={16} /></button>
            </div>

            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              className="min-h-[250px] p-4 outline-none text-lg leading-relaxed"
              placeholder="Start writing..."
              suppressContentEditableWarning
            />
          </div>

          <input type="file" multiple accept="image/*" onChange={handleImageUpload} />

          {submitStatus === 'error' && (
            <div className="bg-red-50 p-3 rounded flex gap-2">
              <AlertCircle className="text-red-500" />
              {errorMessage}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} />
            <button type="button" onClick={() => setShowTermsModal(true)} className="underline text-blue-600">
              Terms & Conditions
            </button>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="border px-4 py-2 rounded">Cancel</button>
            <button type="submit" disabled={isSubmitting || !agreedToTerms}
              className="bg-blue-600 text-white px-4 py-2 rounded">
              Submit
            </button>
          </div>

        </form>
      </div>

      {showTermsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between">
              <h3 className="font-bold">Terms</h3>
              <button onClick={() => setShowTermsModal(false)}><X /></button>
            </div>
            <div className="p-4 overflow-y-auto text-sm text-gray-700 leading-relaxed">
              <p>No NSFW, no plagiarism, respectful content only.</p>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => { setAgreedToTerms(true); setShowTermsModal(false) }}
                className="bg-blue-600 text-white px-4 py-2 rounded">
                I Agree
              </button>
              <button onClick={() => setShowTermsModal(false)} className="border px-4 py-2 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
