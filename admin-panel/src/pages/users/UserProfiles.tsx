import React, { useState, useEffect } from 'react'
import { Search, Filter, Edit, Trash2, Eye, Mail, Phone, MapPin, Calendar, CreditCard, Star } from 'lucide-react'
import adminUserIntegrationService from '../../services/adminUserIntegration'

interface UserProfile {
  id: number
  name: string
  email: string
  phone: string
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
  loyalty_points: number
  total_orders: number
  member_since: string
  is_verified: boolean
  last_login: string
  profile_photo: string
  preferences: {
    theme: string
    notifications: boolean
    newsletter: boolean
  }
}

export default function UserProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    fetchUserProfiles()
  }, [])

  const fetchUserProfiles = async () => {
    try {
      setLoading(true)
      const result = await adminUserIntegrationService.getUserProfiles()
      if (result.success && result.data) {
        setProfiles((result.data as any).profiles || [])
      } else {
        console.error('Failed to fetch user profiles:', result.error)
        setProfiles([])
      }
    } catch (error) {
      console.error('Error fetching user profiles:', error)
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         profile.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'verified' && profile.is_verified) ||
                         (statusFilter === 'unverified' && !profile.is_verified)
    return matchesSearch && matchesStatus
  })

  const handleEditProfile = (profile: UserProfile) => {
    setSelectedProfile(profile)
    setShowEditModal(true)
  }

  const handleViewProfile = (profile: UserProfile) => {
    setSelectedProfile(profile)
    setShowDetailsModal(true)
  }

  const handleDeleteProfile = async (profileId: number) => {
    if (confirm('Are you sure you want to delete this user profile?')) {
      try {
        const response = await fetch(`/api/admin/users/profiles/${profileId}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          setProfiles(profiles.filter(p => p.id !== profileId))
        } else {
          alert('Failed to delete profile')
        }
      } catch (error) {
        console.error('Error deleting profile:', error)
        alert('Error deleting profile')
      }
    }
  }

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    try {
      const result = await adminUserIntegrationService.updateUserProfile(updatedProfile.id, updatedProfile)
      if (result.success) {
        setProfiles(profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p))
        setShowEditModal(false)
        setSelectedProfile(null)
      } else {
        alert('Failed to update profile: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Profiles Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage user profiles, preferences, and account settings</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Users</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{profiles.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Star className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Verified Users</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {profiles.filter(p => p.is_verified).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <CreditCard className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {profiles.reduce((sum, p) => sum + p.total_orders, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Star className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Loyalty Points</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {profiles.reduce((sum, p) => sum + p.loyalty_points, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Loyalty Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Member Since
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={profile.profile_photo || '/default-avatar.png'}
                          alt={profile.name}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {profile.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {profile.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{profile.email}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{profile.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      profile.is_verified 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {profile.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {profile.total_orders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {profile.loyalty_points}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(profile.member_since).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleViewProfile(profile)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditProfile(profile)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProfile(profile.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedProfile && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Edit User Profile
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault()
                handleUpdateProfile(selectedProfile)
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Name
                    </label>
                    <input
                      type="text"
                      value={selectedProfile.name}
                      onChange={(e) => setSelectedProfile({
                        ...selectedProfile,
                        name: e.target.value
                      })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      value={selectedProfile.email}
                      onChange={(e) => setSelectedProfile({
                        ...selectedProfile,
                        email: e.target.value
                      })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={selectedProfile.phone}
                      onChange={(e) => setSelectedProfile({
                        ...selectedProfile,
                        phone: e.target.value
                      })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Loyalty Points
                    </label>
                    <input
                      type="number"
                      value={selectedProfile.loyalty_points}
                      onChange={(e) => setSelectedProfile({
                        ...selectedProfile,
                        loyalty_points: parseInt(e.target.value) || 0
                      })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedProfile.is_verified}
                      onChange={(e) => setSelectedProfile({
                        ...selectedProfile,
                        is_verified: e.target.checked
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                      Verified User
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Update Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedProfile && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                User Profile Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <img
                    className="h-16 w-16 rounded-full"
                    src={selectedProfile.profile_photo || '/default-avatar.png'}
                    alt={selectedProfile.name}
                  />
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedProfile.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Member since {new Date(selectedProfile.member_since).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedProfile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedProfile.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Orders</p>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedProfile.total_orders}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loyalty Points</p>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedProfile.loyalty_points}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedProfile.address.street}, {selectedProfile.address.city}, {selectedProfile.address.state} {selectedProfile.address.zip}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Preferences</p>
                  <div className="text-sm text-gray-900 dark:text-white">
                    <p>Theme: {selectedProfile.preferences.theme}</p>
                    <p>Notifications: {selectedProfile.preferences.notifications ? 'Enabled' : 'Disabled'}</p>
                    <p>Newsletter: {selectedProfile.preferences.newsletter ? 'Subscribed' : 'Not Subscribed'}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
