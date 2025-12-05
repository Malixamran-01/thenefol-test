import React, { useState } from 'react'
import authService from '../../services/auth'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ToastProvider'

const AccountSecurity: React.FC = () => {
  const { user } = useAuth()
  const { notify } = useToast()
  const [formState, setFormState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormState(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formState.newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }

    if (formState.newPassword !== formState.confirmNewPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      await authService.changePassword(
        formState.currentPassword,
        formState.newPassword,
        formState.confirmNewPassword
      )
      notify('success', 'Password updated successfully')
      setFormState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      })
    } catch (err: any) {
      const message = err?.message || 'Failed to update password'
      setError(message)
      notify('error', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Security</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your admin credentials and keep your account secure.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Reset Password
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Enter your current password, then choose a strong new password. All other active sessions will be revoked automatically.
            </p>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={formState.currentPassword}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formState.newPassword}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmNewPassword"
                    value={formState.confirmNewPassword}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Account Details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Name</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{user?.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Role</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{user?.role}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Permissions</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {user?.permissions?.length
                    ? user.permissions.join(', ')
                    : 'No permissions assigned'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800 p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Security Tips</h3>
            <ul className="mt-4 text-sm text-blue-900/80 dark:text-blue-100/80 space-y-2">
              <li>• Use a unique password that you don’t reuse elsewhere.</li>
              <li>• Update your password every few months.</li>
              <li>• Log out from shared devices after use.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountSecurity

