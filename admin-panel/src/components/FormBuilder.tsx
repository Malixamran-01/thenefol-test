import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, Save, Eye, Copy, Settings, Type, Mail, Phone, Calendar, MapPin, Star, CheckSquare, FileText, Image, Link, GripVertical, X, ChevronUp, ChevronDown } from 'lucide-react'

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
  updated_at?: string
}

interface FormSubmission {
  id: number
  form_id: number
  form_name?: string
  data: Record<string, any>
  status: string
  created_at: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://thenefol.com/api'

export default function FormBuilder() {
  const [forms, setForms] = useState<Form[]>([])
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showFormPreview, setShowFormPreview] = useState(false)
  const [showSubmissions, setShowSubmissions] = useState(false)
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [newFormTitle, setNewFormTitle] = useState('')
  const [newFormDescription, setNewFormDescription] = useState('')
  const [draggedFieldIndex, setDraggedFieldIndex] = useState<number | null>(null)

  const fieldTypes = [
    { type: 'text', label: 'Text Input', icon: Type },
    { type: 'email', label: 'Email', icon: Mail },
    { type: 'phone', label: 'Phone', icon: Phone },
    { type: 'textarea', label: 'Text Area', icon: FileText },
    { type: 'select', label: 'Dropdown', icon: Settings },
    { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
    { type: 'radio', label: 'Radio Button', icon: Settings },
    { type: 'date', label: 'Date Picker', icon: Calendar },
    { type: 'number', label: 'Number', icon: Type },
    { type: 'file', label: 'File Upload', icon: Image },
    { type: 'rating', label: 'Rating', icon: Star }
  ]

  useEffect(() => {
    fetchForms()
    fetchSubmissions()
  }, [])

  const fetchForms = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/forms`)
      if (response.ok) {
        const data = await response.json()
        const formsData = data.forms || data || []
        setForms(formsData.map((form: any) => ({
          ...form,
          fields: typeof form.fields === 'string' ? JSON.parse(form.fields) : (form.fields || [])
        })))
      }
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubmissions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/forms/submissions`)
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions || data || [])
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
    }
  }

  const handleCreateForm = async () => {
    if (!newFormTitle.trim()) {
      alert('Please enter a form title')
      return
    }

    try {
      const newForm: Partial<Form> = {
        name: newFormTitle,
        fields: [],
        status: 'draft'
      }

      const response = await fetch(`${API_BASE}/api/forms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFormTitle,
          description: newFormDescription,
          fields: [],
          settings: {},
          isPublished: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        const createdForm = {
          ...data,
          fields: typeof data.fields === 'string' ? JSON.parse(data.fields) : (data.fields || [])
        }
        setForms([createdForm, ...forms])
        setSelectedForm(createdForm)
        setShowCreateForm(false)
        setNewFormTitle('')
        setNewFormDescription('')
        alert('Form created successfully!')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to create form')
      }
    } catch (error) {
      console.error('Error creating form:', error)
      alert('Failed to create form')
    }
  }

  const handleAddField = (type: string) => {
    if (!selectedForm) return
    
    const newField: FormField = {
      id: Date.now().toString(),
      type: type as any,
      label: `New ${type} Field`,
      required: false,
      options: (type === 'select' || type === 'radio') ? ['Option 1', 'Option 2'] : undefined
    }
    
    const updatedFields = [...(selectedForm.fields || []), newField]
    updateFormFields(updatedFields)
  }

  const handleDeleteField = (fieldId: string) => {
    if (!selectedForm) return
    const updatedFields = selectedForm.fields.filter(f => f.id !== fieldId)
    updateFormFields(updatedFields)
  }

  const handleEditField = (field: FormField) => {
    setEditingField({ ...field })
  }

  const handleSaveField = () => {
    if (!selectedForm || !editingField) return
    
    const updatedFields = selectedForm.fields.map(f => 
      f.id === editingField.id ? editingField : f
    )
    updateFormFields(updatedFields)
    setEditingField(null)
  }

  const updateFormFields = async (fields: FormField[]) => {
    if (!selectedForm) return

    try {
      const updatedForm = { ...selectedForm, fields }
      
      const response = await fetch(`${API_BASE}/api/forms/${selectedForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updatedForm.name,
          description: '',
          fields: fields,
          settings: {},
          isPublished: updatedForm.status === 'active'
        })
      })

      if (response.ok) {
        const data = await response.json()
        const savedForm = {
          ...data,
          fields: typeof data.fields === 'string' ? JSON.parse(data.fields) : (data.fields || [])
        }
        setSelectedForm(savedForm)
        setForms(forms.map(f => f.id === savedForm.id ? savedForm : f))
      }
    } catch (error) {
      console.error('Error updating form:', error)
      alert('Failed to update form')
    }
  }

  const handlePublishForm = async (formId: number) => {
    try {
      const form = forms.find(f => f.id === formId)
      if (!form) return

      const response = await fetch(`${API_BASE}/api/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: '',
          fields: form.fields,
          settings: {},
          isPublished: true
        })
      })

      if (response.ok) {
        await fetchForms()
        alert('Form published successfully!')
      }
    } catch (error) {
      console.error('Error publishing form:', error)
      alert('Failed to publish form')
    }
  }

  const handleUnpublishForm = async (formId: number) => {
    try {
      const form = forms.find(f => f.id === formId)
      if (!form) return

      const response = await fetch(`${API_BASE}/api/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: '',
          fields: form.fields,
          settings: {},
          isPublished: false
        })
      })

      if (response.ok) {
        await fetchForms()
        alert('Form unpublished successfully!')
      }
    } catch (error) {
      console.error('Error unpublishing form:', error)
      alert('Failed to unpublish form')
    }
  }

  const handleCopyForm = async (formId: number) => {
    try {
      const form = forms.find(f => f.id === formId)
      if (!form) return

      const response = await fetch(`${API_BASE}/api/forms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${form.name} (Copy)`,
          description: '',
          fields: form.fields,
          settings: {},
          isPublished: false
        })
      })

      if (response.ok) {
        await fetchForms()
        alert('Form copied successfully!')
      }
    } catch (error) {
      console.error('Error copying form:', error)
      alert('Failed to copy form')
    }
  }

  const handleDeleteForm = async (formId: number) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) return

    try {
      const response = await fetch(`${API_BASE}/api/forms/${formId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setForms(forms.filter(f => f.id !== formId))
        if (selectedForm?.id === formId) {
          setSelectedForm(null)
        }
        alert('Form deleted successfully!')
      }
    } catch (error) {
      console.error('Error deleting form:', error)
      alert('Failed to delete form')
    }
  }

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (!selectedForm) return
    const fields = [...selectedForm.fields]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex < 0 || newIndex >= fields.length) return
    
    [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]]
    updateFormFields(fields)
  }

  const getFieldIcon = (type: string) => {
    const fieldType = fieldTypes.find(ft => ft.type === type)
    return fieldType ? fieldType.icon : Type
  }

  const getFormSubmissions = (formId: number) => {
    return submissions.filter(s => s.form_id === formId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Form Builder
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Create custom forms to collect customer data and feedback
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSubmissions(!showSubmissions)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>View Submissions</span>
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Form</span>
          </button>
        </div>
      </div>

      {/* Submissions View */}
      {showSubmissions && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              All Form Submissions
            </h2>
            <button
              onClick={() => setShowSubmissions(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No submissions yet</p>
            ) : (
              submissions.map((submission) => (
                <div key={submission.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {submission.form_name || `Form #${submission.form_id}`}
                    </h3>
                    <span className="text-sm text-slate-500">
                      {new Date(submission.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(submission.data).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{key}:</span>{' '}
                        <span className="text-slate-600 dark:text-slate-400">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Forms List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Your Forms
        </h2>
        {forms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-4">No forms created yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Form
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => {
              const formSubmissions = getFormSubmissions(form.id)
              return (
                <div key={form.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {form.name}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      form.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {form.status === 'active' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-500 mb-4">
                    <span>{formSubmissions.length} submissions</span>
                    <span>{form.fields?.length || 0} fields</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedForm(form)}
                      className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedForm(form)
                        setShowFormPreview(true)
                      }}
                      className="px-3 py-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleCopyForm(form.id)}
                      className="px-3 py-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteForm(form.id)}
                      className="px-3 py-1 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 text-sm rounded hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Form Builder */}
      {selectedForm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Field Types */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Add Field
            </h3>
            <div className="space-y-2">
              {fieldTypes.map((fieldType) => {
                const IconComponent = fieldType.icon
                return (
                  <button
                    key={fieldType.type}
                    onClick={() => handleAddField(fieldType.type)}
                    className="w-full flex items-center space-x-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <IconComponent className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {fieldType.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form Fields */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Form Fields: {selectedForm.name}
              </h3>
              <div className="flex gap-2">
                {selectedForm.status === 'active' ? (
                  <button
                    onClick={() => handleUnpublishForm(selectedForm.id)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    onClick={() => handlePublishForm(selectedForm.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Publish Form
                  </button>
                )}
              </div>
            </div>
            
            {selectedForm.fields?.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                <p className="text-slate-500 mb-4">No fields added yet</p>
                <p className="text-sm text-slate-400">Click on a field type to add it to your form</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedForm.fields?.map((field, index) => {
                  const IconComponent = getFieldIcon(field.type)
                  return (
                    <div key={field.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <GripVertical className="h-4 w-4 text-slate-400 cursor-move" />
                          <IconComponent className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {field.label}
                          </span>
                          {field.required && (
                            <span className="text-red-500 text-sm">*</span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {index > 0 && (
                            <button
                              onClick={() => handleMoveField(index, 'up')}
                              className="p-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                          )}
                          {index < selectedForm.fields.length - 1 && (
                            <button
                              onClick={() => handleMoveField(index, 'down')}
                              className="p-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditField(field)}
                            className="p-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteField(field.id)}
                            className="p-1 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Type: {field.type}
                        {field.placeholder && (
                          <span className="ml-2">Placeholder: {field.placeholder}</span>
                        )}
                      </div>
                      
                      {field.options && (
                        <div className="mt-2">
                          <p className="text-sm text-slate-600 dark:text-slate-400">Options:</p>
                          <ul className="text-sm text-slate-500 dark:text-slate-500">
                            {field.options.map((option, optIndex) => (
                              <li key={optIndex}>• {option}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Field Edit Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Edit Field
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Label
                </label>
                <input
                  type="text"
                  value={editingField.label}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Placeholder
                </label>
                <input
                  type="text"
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              {(editingField.type === 'select' || editingField.type === 'radio') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Options (one per line)
                  </label>
                  <textarea
                    value={editingField.options?.join('\n') || ''}
                    onChange={(e) => setEditingField({ 
                      ...editingField, 
                      options: e.target.value.split('\n').filter(o => o.trim()) 
                    })}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editingField.required}
                  onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Required
                </label>
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setEditingField(null)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveField}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Preview Modal */}
      {showFormPreview && selectedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Form Preview: {selectedForm.name}
              </h3>
              <button
                onClick={() => setShowFormPreview(false)}
                className="text-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedForm.fields?.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.type === 'text' && (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  )}
                  
                  {field.type === 'email' && (
                    <input
                      type="email"
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  )}
                  
                  {field.type === 'phone' && (
                    <input
                      type="tel"
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  )}
                  
                  {field.type === 'textarea' && (
                    <textarea
                      rows={4}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  )}
                  
                  {field.type === 'select' && (
                    <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                      <option>Select an option</option>
                      {field.options?.map((option, index) => (
                        <option key={index} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                  
                  {field.type === 'checkbox' && (
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {field.label}
                      </span>
                    </div>
                  )}
                  
                  {field.type === 'radio' && (
                    <div className="space-y-2">
                      {field.options?.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input type="radio" name={field.id} className="rounded" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {option}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {field.type === 'date' && (
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  )}
                  
                  {field.type === 'number' && (
                    <input
                      type="number"
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  )}
                  
                  {field.type === 'file' && (
                    <input
                      type="file"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  )}
                  
                  {field.type === 'rating' && (
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} className="text-yellow-400 hover:text-yellow-500">
                          <Star className="h-6 w-6" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Create New Form
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Form Title *
                </label>
                <input
                  type="text"
                  value={newFormTitle}
                  onChange={(e) => setNewFormTitle(e.target.value)}
                  placeholder="Enter form title"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newFormDescription}
                  onChange={(e) => setNewFormDescription(e.target.value)}
                  placeholder="Enter form description"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewFormTitle('')
                  setNewFormDescription('')
                }}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateForm}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
