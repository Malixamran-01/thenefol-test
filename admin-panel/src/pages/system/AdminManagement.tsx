import React, { useEffect, useState } from 'react'
import { UserPlus, Download, Copy, Check, X, Trash2, Edit2, Save, Plus } from 'lucide-react'
import { useToast } from '../../components/ToastProvider'
import Can from '../../components/Can'
import { getApiBaseUrl } from '../../utils/apiUrl'

interface AdminUser {
  id: number
  name: string
  email: string
  is_active: boolean
  layout_permissions?: Array<{ layout_page_slug: string; can_edit: boolean }>
  page_permissions?: Array<{ page_path: string; can_access: boolean }>
}

interface AdminPanelPage {
  path: string
  name: string
  section: string
}

interface BulkUser {
  name: string
  email: string
  password: string
  pagePaths: string[]
}

export default function AdminManagement() {
  const { notify } = useToast()
  const generatePassword = (): string => {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }

  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [adminPages, setAdminPages] = useState<AdminPanelPage[]>([])
  const [loading, setLoading] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkUsers, setBulkUsers] = useState<BulkUser[]>(() => [{ name: '', email: '', password: generatePassword(), pagePaths: [] }])
  const [editingAdmin, setEditingAdmin] = useState<number | null>(null)
  const [editingPages, setEditingPages] = useState<string[]>([])

  // Use centralized API URL utility that respects VITE_API_URL
  const apiBase = getApiBaseUrl()
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [adminsRes, pagesRes] = await Promise.all([
        fetch(`${apiBase}/staff/users/with-layouts`, { headers: authHeaders }),
        fetch(`${apiBase}/staff/admin-pages`, { headers: authHeaders })
      ])

      const adminsData = await adminsRes.json()
      const pagesData = await pagesRes.json()

      setAdmins(adminsData?.data || adminsData || [])
      setAdminPages(pagesData?.data || pagesData || [])
    } catch (error: any) {
      notify('error', 'Failed to load data: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }


  const addBulkUserRow = () => {
    setBulkUsers([...bulkUsers, { name: '', email: '', password: generatePassword(), pagePaths: [] }])
  }

  const removeBulkUserRow = (index: number) => {
    setBulkUsers(bulkUsers.filter((_, i) => i !== index))
  }

  const updateBulkUser = (index: number, field: keyof BulkUser, value: any) => {
    const updated = [...bulkUsers]
    if (field === 'pagePaths') {
      updated[index].pagePaths = value
    } else {
      updated[index][field] = value
    }
    setBulkUsers(updated)
  }

  const generatePasswordForRow = (index: number) => {
    updateBulkUser(index, 'password', generatePassword())
  }

  const handleBulkCreate = async () => {
    // Validate all users
    for (const user of bulkUsers) {
      if (!user.name || !user.email || !user.password) {
        notify('error', 'Please fill all fields for all users')
        return
      }
    }

    try {
      setLoading(true)
      const usersToCreate = bulkUsers.map(u => ({
        name: u.name,
        email: u.email,
        password: u.password
      }))

      const res = await fetch(`${apiBase}/staff/users/bulk-create`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ users: usersToCreate })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create admins')
      }

      const results = data.data?.results || []
      const created = results.filter((r: any) => r.success)
      const failed = results.filter((r: any) => r.success === false)

      // Assign page permissions for successfully created users
      for (let i = 0; i < results.length; i++) {
        if (results[i].success && bulkUsers[i].pagePaths.length > 0) {
          const staffId = results[i].user.id
          try {
            await fetch(`${apiBase}/staff/page-permissions`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                staffId,
                pagePaths: bulkUsers[i].pagePaths
              })
            })
          } catch (err) {
            console.error('Failed to assign page permissions for', results[i].user.email, err)
          }
        }
      }

      notify('success', `Created ${created.length} admin(s)${failed.length > 0 ? `, ${failed.length} failed` : ''}`)
      setBulkUsers([{ name: '', email: '', password: generatePassword(), pagePaths: [] }])
      setShowBulkForm(false)
      await loadData()
    } catch (error: any) {
      notify('error', 'Failed to create admins: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleEditPages = (admin: AdminUser) => {
    setEditingAdmin(admin.id)
    setEditingPages(admin.page_permissions?.map(p => p.page_path) || [])
  }

  const handleSavePages = async (staffId: number) => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/staff/page-permissions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          staffId,
          pagePaths: editingPages
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update page permissions')
      }

      notify('success', 'Page permissions updated successfully')
      setEditingAdmin(null)
      await loadData()
    } catch (error: any) {
      notify('error', 'Failed to update page permissions: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      notify('success', 'Copied to clipboard')
    }).catch(() => {
      notify('error', 'Failed to copy')
    })
  }

  const exportCredentials = (users: BulkUser[]) => {
    const csv = [
      ['Name', 'Email', 'Password', 'Page Paths'].join(','),
      ...users.map(u => [
        u.name,
        u.email,
        u.password,
        u.pagePaths.join(';')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin-credentials-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <style>{`
        :root {
          --arctic-blue-primary: #7DD3D3;
          --arctic-blue-primary-hover: #5EC4C4;
          --arctic-blue-primary-dark: #4A9FAF;
          --arctic-blue-light: #E0F5F5;
          --arctic-blue-lighter: #F0F9F9;
          --arctic-blue-background: #F4F9F9;
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-light mb-2 tracking-[0.15em]" 
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            Admin Management
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Generate multiple admin IDs and assign layout page access
          </p>
        </div>
        <Can role="admin">
          <button
            onClick={() => setShowBulkForm(!showBulkForm)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <UserPlus className="h-5 w-5" />
            {showBulkForm ? 'Cancel' : 'Bulk Create Admins'}
          </button>
        </Can>
      </div>

      {/* Bulk Create Form */}
      {showBulkForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Bulk Create Admin Users</h2>
            <div className="flex gap-2">
              <button
                onClick={() => exportCredentials(bulkUsers)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={addBulkUserRow}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Row
              </button>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {bulkUsers.map((user, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={user.name}
                    onChange={(e) => updateBulkUser(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Admin Name"
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={user.email}
                    onChange={(e) => updateBulkUser(index, 'email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="admin@example.com"
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={user.password}
                      onChange={(e) => updateBulkUser(index, 'password', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Auto-generated"
                    />
                    <button
                      onClick={() => generatePasswordForRow(index)}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                      title="Generate Password"
                    >
                      🔄
                    </button>
                    <button
                      onClick={() => copyToClipboard(user.password)}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                      title="Copy Password"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin Panel Pages</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white">
                    {Object.entries(
                      adminPages.reduce((acc, page) => {
                        if (!acc[page.section]) acc[page.section] = []
                        acc[page.section].push(page)
                        return acc
                      }, {} as Record<string, AdminPanelPage[]>)
                    ).map(([section, pages]) => (
                      <div key={section} className="mb-3 last:mb-0">
                        <div className="text-xs font-semibold text-gray-600 mb-1 px-1">{section}</div>
                        <div className="space-y-1">
                          {pages.map(page => (
                            <label key={page.path} className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={user.pagePaths.includes(page.path)}
                                onChange={(e) => {
                                  const newPaths = e.target.checked
                                    ? [...user.pagePaths, page.path]
                                    : user.pagePaths.filter(p => p !== page.path)
                                  updateBulkUser(index, 'pagePaths', newPaths)
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-700">{page.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Select pages to assign to this admin</p>
                </div>
                <div className="col-span-12 md:col-span-1 flex items-end">
                  {bulkUsers.length > 1 && (
                    <button
                      onClick={() => removeBulkUserRow(index)}
                      className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mx-auto" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleBulkCreate}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : `Create ${bulkUsers.length} Admin(s)`}
            </button>
            <button
              onClick={() => {
                setShowBulkForm(false)
                setBulkUsers([{ name: '', email: '', password: generatePassword(), pagePaths: [] }])
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Admins List */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Existing Admins</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-3 pr-4 text-left">Name</th>
                    <th className="py-3 pr-4 text-left">Email</th>
                    <th className="py-3 pr-4 text-left">Status</th>
                    <th className="py-3 pr-4 text-left">Layout Access</th>
                    <th className="py-3 pr-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(admin => (
                    <tr key={admin.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium">{admin.name}</td>
                      <td className="py-3 pr-4">{admin.email}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          admin.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {editingAdmin === admin.id ? (
                          <div className="space-y-3 max-w-2xl">
                            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white">
                              {Object.entries(
                                adminPages.reduce((acc, page) => {
                                  if (!acc[page.section]) acc[page.section] = []
                                  acc[page.section].push(page)
                                  return acc
                                }, {} as Record<string, AdminPanelPage[]>)
                              ).map(([section, pages]) => (
                                <div key={section} className="mb-4 last:mb-0">
                                  <div className="text-xs font-semibold text-gray-700 mb-2 px-1 border-b border-gray-200 pb-1">{section}</div>
                                  <div className="grid grid-cols-2 gap-1">
                                    {pages.map(page => (
                                      <label key={page.path} className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={editingPages.includes(page.path)}
                                          onChange={(e) => {
                                            const newPaths = e.target.checked
                                              ? [...editingPages, page.path]
                                              : editingPages.filter(p => p !== page.path)
                                            setEditingPages(newPaths)
                                          }}
                                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-gray-700">{page.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSavePages(admin.id)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center gap-1 font-medium"
                              >
                                <Save className="h-3 w-3" />
                                Save Changes
                              </button>
                              <button
                                onClick={() => {
                                  setEditingAdmin(null)
                                  setEditingPages([])
                                }}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 flex items-center gap-1 font-medium"
                              >
                                <X className="h-3 w-3" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 font-medium">
                              {admin.page_permissions?.length || 0} page(s) assigned
                            </span>
                            {admin.page_permissions && admin.page_permissions.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {admin.page_permissions.slice(0, 3).map((perm, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                    {adminPages.find(p => p.path === perm.page_path)?.name || perm.page_path.split('/').pop()}
                                  </span>
                                ))}
                                {admin.page_permissions.length > 3 && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                    +{admin.page_permissions.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Can role="admin">
                          <button
                            onClick={() => editingAdmin === admin.id 
                              ? setEditingAdmin(null) 
                              : handleEditPages(admin)
                            }
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs flex items-center gap-1"
                          >
                            {editingAdmin === admin.id ? (
                              <>
                                <X className="h-3 w-3" />
                                Cancel
                              </>
                            ) : (
                              <>
                                <Edit2 className="h-3 w-3" />
                                Edit Pages
                              </>
                            )}
                          </button>
                        </Can>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {admins.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No admin users found. Create your first admin using the bulk create form.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

