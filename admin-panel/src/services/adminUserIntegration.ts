// API Service for Admin Panel to User Panel Integration
// This service handles all API calls between admin panel and user panel

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://thenefol.com/api'

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

class AdminUserIntegrationService {
  private baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL
  }

  // Generic API call method
  private async apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'API call failed',
        }
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      }
    } catch (error) {
      console.error('API call error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // User Management APIs
  async getUserProfiles(page = 1, limit = 10, search = '') {
    return this.apiCall(`/api/admin/users/profiles?page=${page}&limit=${limit}&search=${search}`)
  }

  async getUserProfile(userId: number) {
    return this.apiCall(`/api/admin/users/profiles/${userId}`)
  }

  async updateUserProfile(userId: number, profileData: any) {
    return this.apiCall(`/api/admin/users/profiles/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
  }

  async deleteUserProfile(userId: number) {
    return this.apiCall(`/api/admin/users/profiles/${userId}`, {
      method: 'DELETE',
    })
  }

  // User Notifications APIs
  async getNotifications(page = 1, limit = 10, filters = {}) {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    })
    return this.apiCall(`/api/admin/notifications?${queryParams}`)
  }

  async createNotification(notificationData: any) {
    return this.apiCall('/api/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    })
  }

  async updateNotification(notificationId: number, notificationData: any) {
    return this.apiCall(`/api/admin/notifications/${notificationId}`, {
      method: 'PUT',
      body: JSON.stringify(notificationData),
    })
  }

  async deleteNotification(notificationId: number) {
    return this.apiCall(`/api/admin/notifications/${notificationId}`, {
      method: 'DELETE',
    })
  }

  async sendNotification(notificationId: number) {
    return this.apiCall(`/api/admin/notifications/${notificationId}/send`, {
      method: 'POST',
    })
  }

  // Loyalty Program APIs
  async getLoyaltyPrograms() {
    return this.apiCall('/api/admin/loyalty/programs')
  }

  async createLoyaltyProgram(programData: any) {
    return this.apiCall('/api/admin/loyalty/programs', {
      method: 'POST',
      body: JSON.stringify(programData),
    })
  }

  async updateLoyaltyProgram(programId: number, programData: any) {
    return this.apiCall(`/api/admin/loyalty/programs/${programId}`, {
      method: 'PUT',
      body: JSON.stringify(programData),
    })
  }

  async deleteLoyaltyProgram(programId: number) {
    return this.apiCall(`/api/admin/loyalty/programs/${programId}`, {
      method: 'DELETE',
    })
  }

  async getLoyaltyTiers() {
    return this.apiCall('/api/admin/loyalty/tiers')
  }

  async getLoyaltyUsers(page = 1, limit = 10) {
    return this.apiCall(`/api/admin/loyalty/users?page=${page}&limit=${limit}`)
  }

  async adjustUserPoints(userId: number, points: number, reason: string) {
    return this.apiCall(`/api/admin/loyalty/users/${userId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ points, reason }),
    })
  }

  // Static Pages APIs
  async getStaticPages() {
    return this.apiCall('/api/admin/static-pages')
  }

  async createStaticPage(pageData: any) {
    return this.apiCall('/api/admin/static-pages', {
      method: 'POST',
      body: JSON.stringify(pageData),
    })
  }

  async updateStaticPage(pageId: number, pageData: any) {
    return this.apiCall(`/api/admin/static-pages/${pageId}`, {
      method: 'PUT',
      body: JSON.stringify(pageData),
    })
  }

  async deleteStaticPage(pageId: number) {
    return this.apiCall(`/api/admin/static-pages/${pageId}`, {
      method: 'DELETE',
    })
  }

  async toggleStaticPageStatus(pageId: number, isActive: boolean) {
    return this.apiCall(`/api/admin/static-pages/${pageId}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    })
  }

  // Community Management APIs
  async getCommunityPosts(page = 1, limit = 10, filters = {}) {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    })
    return this.apiCall(`/api/admin/community/posts?${queryParams}`)
  }

  async getCommunityComments(page = 1, limit = 10, filters = {}) {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    })
    return this.apiCall(`/api/admin/community/comments?${queryParams}`)
  }

  async updatePostStatus(postId: number, status: string) {
    return this.apiCall(`/api/admin/community/posts/${postId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  }

  async updateCommentStatus(commentId: number, status: string) {
    return this.apiCall(`/api/admin/community/comments/${commentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  }

  async deletePost(postId: number) {
    return this.apiCall(`/api/admin/community/posts/${postId}`, {
      method: 'DELETE',
    })
  }

  async deleteComment(commentId: number) {
    return this.apiCall(`/api/admin/community/comments/${commentId}`, {
      method: 'DELETE',
    })
  }

  // Cart & Checkout APIs
  async getCartItems(page = 1, limit = 10, filters = {}) {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    })
    return this.apiCall(`/api/admin/cart/items?${queryParams}`)
  }

  async updateCartItemQuantity(itemId: number, quantity: number) {
    return this.apiCall(`/api/admin/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    })
  }

  async removeCartItem(itemId: number) {
    return this.apiCall(`/api/admin/cart/items/${itemId}`, {
      method: 'DELETE',
    })
  }

  async getCheckoutSessions(page = 1, limit = 10, filters = {}) {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    })
    return this.apiCall(`/api/admin/checkout/sessions?${queryParams}`)
  }

  async updateSessionStatus(sessionId: number, status: string) {
    return this.apiCall(`/api/admin/checkout/sessions/${sessionId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  }

  // Analytics APIs
  async getDashboardStats() {
    return this.apiCall('/api/admin/dashboard/stats')
  }

  async getUserAnalytics(timeRange = '30d') {
    return this.apiCall(`/api/admin/analytics/users?range=${timeRange}`)
  }

  async getOrderAnalytics(timeRange = '30d') {
    return this.apiCall(`/api/admin/analytics/orders?range=${timeRange}`)
  }

  async getRevenueAnalytics(timeRange = '30d') {
    return this.apiCall(`/api/admin/analytics/revenue?range=${timeRange}`)
  }

  // Real-time Updates
  async subscribeToUpdates(callback: (data: any) => void) {
    // This would integrate with Socket.IO for real-time updates
    // Implementation depends on your Socket.IO setup
    console.log('Subscribing to real-time updates...')
  }

  async unsubscribeFromUpdates() {
    console.log('Unsubscribing from real-time updates...')
  }

  // Bulk Operations
  async bulkUpdateUserStatus(userIds: number[], status: string) {
    return this.apiCall('/api/admin/users/bulk-status', {
      method: 'PUT',
      body: JSON.stringify({ userIds, status }),
    })
  }

  async bulkSendNotifications(userIds: number[], notificationData: any) {
    return this.apiCall('/api/admin/notifications/bulk-send', {
      method: 'POST',
      body: JSON.stringify({ userIds, notificationData }),
    })
  }

  async bulkDeletePosts(postIds: number[]) {
    return this.apiCall('/api/admin/community/posts/bulk-delete', {
      method: 'DELETE',
      body: JSON.stringify({ postIds }),
    })
  }

  // Export/Import
  async exportUserData(format = 'csv') {
    return this.apiCall(`/api/admin/users/export?format=${format}`)
  }

  async importUserData(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    
    return this.apiCall('/api/admin/users/import', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    })
  }

  // System Health Check
  async getSystemHealth() {
    return this.apiCall('/api/admin/system/health')
  }

  async getApiStatus() {
    return this.apiCall('/api/admin/system/api-status')
  }
}

// Create singleton instance
const adminUserIntegrationService = new AdminUserIntegrationService()

export default adminUserIntegrationService

// Export types for TypeScript
export type { ApiResponse }
export { AdminUserIntegrationService }
