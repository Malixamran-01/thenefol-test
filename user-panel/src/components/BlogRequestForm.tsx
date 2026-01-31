import React, { useState, useEffect, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, Type, Palette } from 'lucide-react'
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

interface LinkModalData {
  text: string
  url: string
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
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkData, setLinkData] = useState<LinkModalData>({ text: '', url: '' })
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [currentColor, setCurrentColor] = useState('#000000')

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
    '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082'
  ]

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
    editorRef.current?.focus()
    handleEditorInput()
  }

  const setHeading = (level: number) => {
    exec('formatBlock', `h${level}`)
  }

  const setParagraph = () => {
    exec('formatBlock', 'p')
  }

  const insertLink = () => {
    const selection = window.getSelection()
    const selectedText = selection?.toString() || ''
    setLinkData({ text: selectedText, url: '' })
    setShowLinkModal(true)
  }

  const confirmLink = () => {
    if (!linkData.url) return
    
    // If there's text, insert it with the link
    if (linkData.text) {
      const html = `<a href="${linkData.url}" target="_blank" rel="noopener noreferrer" style="color: #4B97C9; text-decoration: underline;">${linkData.text}</a>`
      exec('insertHTML', html)
    } else {
      // If no text, just insert the URL as clickable link
      const html = `<a href="${linkData.url}" target="_blank" rel="noopener noreferrer" style="color: #4B97C9; text-decoration: underline;">${linkData.url}</a>`
      exec('insertHTML', html)
    }
    
    setShowLinkModal(false)
    setLinkData({ text: '', url: '' })
  }

  const applyColor = (color: string) => {
    setCurrentColor(color)
    exec('foreColor', color)
    setShowColorPicker(false)
  }

  const insertList = (ordered: boolean) => {
    // Get the current selection
    const selection = window.getSelection()
    if (!selection || !editorRef.current) return

    // Save the selection range
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null
    
    if (ordered) {
      exec('insertOrderedList')
    } else {
      exec('insertUnorderedList')
    }

    // Restore focus
    editorRef.current.focus()
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
    <>
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .editor-content {
          line-height: 1.8;
        }
        .editor-content h1 { font-size: 2em; font-weight: bold; margin: 0.5em 0; }
        .editor-content h2 { font-size: 1.75em; font-weight: bold; margin: 0.5em 0; }
        .editor-content h3 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0; }
        .editor-content h4 { font-size: 1.25em; font-weight: bold; margin: 0.5em 0; }
        .editor-content p { margin: 0.5em 0; }
        .editor-content ul { list-style: disc; margin-left: 2em; padding-left: 0.5em; }
        .editor-content ol { list-style: decimal; margin-left: 2em; padding-left: 0.5em; }
        .editor-content li { margin: 0.25em 0; padding-left: 0.25em; }
        .editor-content a { color: #4B97C9; text-decoration: underline; }
      `}</style>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Submit Blog Post Request</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>

        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name *</label>
              <input 
                name="author_name" 
                value={formData.author_name} 
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your full name" 
                required 
                disabled={isSubmitting || (isAuthenticated && !!user?.name)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
              <input 
                name="author_email" 
                value={formData.author_email} 
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="your.email@domain.com" 
                required 
                disabled={isSubmitting || (isAuthenticated && !!user?.email)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Blog Title *</label>
            <input 
              name="title" 
              value={formData.title} 
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter an engaging title for your blog post" 
              required 
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Short Excerpt *</label>
            <textarea 
              name="excerpt" 
              value={formData.excerpt} 
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3} 
              placeholder="Write a brief summary (2-3 sentences)" 
              required 
              disabled={isSubmitting}
            />
          </div>

          {/* Rich Text Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Blog Content *</label>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
              {/* Enhanced Toolbar */}
              <div className="bg-gray-50 border-b border-gray-300 p-3">
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Text Format Group */}
                  <div className="flex gap-1 border-r border-gray-300 pr-2">
                    <button 
                      type="button" 
                      onClick={setParagraph} 
                      className="px-3 py-2 hover:bg-gray-200 rounded transition-colors text-sm font-medium"
                      title="Paragraph"
                    >
                      P
                    </button>
                    {[1, 2, 3, 4].map(h => (
                      <button 
                        key={h} 
                        type="button" 
                        onClick={() => setHeading(h)} 
                        className="px-3 py-2 hover:bg-gray-200 rounded transition-colors text-sm font-semibold"
                        title={`Heading ${h}`}
                      >
                        H{h}
                      </button>
                    ))}
                  </div>

                  {/* Style Group */}
                  <div className="flex gap-1 border-r border-gray-300 pr-2">
                    <button 
                      type="button" 
                      onClick={() => exec('bold')} 
                      className="p-2 hover:bg-gray-200 rounded transition-colors"
                      title="Bold"
                    >
                      <Bold size={20} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => exec('italic')} 
                      className="p-2 hover:bg-gray-200 rounded transition-colors"
                      title="Italic"
                    >
                      <Italic size={20} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => exec('underline')} 
                      className="p-2 hover:bg-gray-200 rounded transition-colors"
                      title="Underline"
                    >
                      <Underline size={20} />
                    </button>
                  </div>

                  {/* Color Picker */}
                  <div className="relative border-r border-gray-300 pr-2">
                    <button 
                      type="button" 
                      onClick={() => setShowColorPicker(!showColorPicker)} 
                      className="p-2 hover:bg-gray-200 rounded transition-colors flex items-center gap-1"
                      title="Text Color"
                    >
                      <Palette size={20} />
                      <div 
                        className="w-4 h-4 rounded border border-gray-400" 
                        style={{ backgroundColor: currentColor }}
                      />
                    </button>
                    {showColorPicker && (
                      <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-3 z-10">
                        <div className="grid grid-cols-5 gap-2 w-48">
                          {colors.map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => applyColor(color)}
                              className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                              style={{ 
                                backgroundColor: color,
                                borderColor: currentColor === color ? '#4B97C9' : '#D1D5DB'
                              }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Link & Lists Group */}
                  <div className="flex gap-1">
                    <button 
                      type="button" 
                      onClick={insertLink} 
                      className="p-2 hover:bg-gray-200 rounded transition-colors"
                      title="Insert Link"
                    >
                      <LinkIcon size={20} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertList(false)} 
                      className="p-2 hover:bg-gray-200 rounded transition-colors"
                      title="Bullet List"
                    >
                      <List size={20} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertList(true)} 
                      className="p-2 hover:bg-gray-200 rounded transition-colors"
                      title="Numbered List"
                    >
                      <ListOrdered size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor Area */}
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                className="editor-content min-h-[400px] p-6 outline-none text-base bg-white"
                data-placeholder="Start writing your blog post here... Use the toolbar above to format your text, add links, and create lists."
                suppressContentEditableWarning
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Images (Optional)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-3">
                Drag and drop images here, or click to select
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={isSubmitting}
              />
              <label
                htmlFor="image-upload"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
              >
                Choose Images
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: JPG, PNG, GIF. Max 5MB per image.
              </p>
            </div>

            {/* Display uploaded images */}
            {formData.images.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Images:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        disabled={isSubmitting}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate">{image.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {submitStatus === 'error' && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <input 
              type="checkbox" 
              id="terms"
              checked={agreedToTerms} 
              onChange={e => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="terms" className="text-sm text-gray-700">
              I agree to the{' '}
              <button 
                type="button" 
                onClick={() => setShowTermsModal(true)} 
                className="text-blue-600 hover:text-blue-700 underline font-medium"
              >
                Terms & Conditions
              </button>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || !agreedToTerms}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>

        </form>
        </div>
      </div>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Insert Link</h3>
              <button 
                onClick={() => {
                  setShowLinkModal(false)
                  setLinkData({ text: '', url: '' })
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Text (What the link should say)
                </label>
                <input
                  type="text"
                  value={linkData.text}
                  onChange={e => setLinkData(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="e.g., Click here to learn more"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use the URL as display text</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL (Link destination) *
                </label>
                <input
                  type="url"
                  value={linkData.url}
                  onChange={e => setLinkData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowLinkModal(false)
                    setLinkData({ text: '', url: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLink}
                  disabled={!linkData.url}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Insert Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Terms & Conditions</h3>
              <button 
                onClick={() => setShowTermsModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-sm text-gray-700 leading-relaxed space-y-3">
              <p className="font-medium">By submitting your blog post, you agree to the following:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>No NSFW (Not Safe For Work) content</li>
                <li>No plagiarism - all content must be original or properly attributed</li>
                <li>Content must be respectful and appropriate for all audiences</li>
                <li>NEFOL® reserves the right to review, edit, or reject any submission</li>
                <li>You retain ownership of your content but grant NEFOL® the right to publish it</li>
              </ul>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button 
                onClick={() => { 
                  setAgreedToTerms(true)
                  setShowTermsModal(false) 
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                I Agree
              </button>
              <button 
                onClick={() => setShowTermsModal(false)} 
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </>
  )
}
