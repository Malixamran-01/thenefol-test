// Configuration service for managing app settings
interface AppConfig {
  api: {
    baseUrl: string
    timeout: number
    retries: number
  }
  features: {
    loyaltyProgram: boolean
    affiliateProgram: boolean
    cashbackSystem: boolean
    emailMarketing: boolean
    smsMarketing: boolean
    pushNotifications: boolean
    whatsappChat: boolean
    liveChat: boolean
    analytics: boolean
    formBuilder: boolean
    workflowAutomation: boolean
    customerSegmentation: boolean
    journeyTracking: boolean
    actionableAnalytics: boolean
    aiBox: boolean
    journeyFunnel: boolean
    aiPersonalization: boolean
    customAudience: boolean
    omniChannel: boolean
    apiManager: boolean
  }
  ui: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    timezone: string
    dateFormat: string
    currency: string
  }
  security: {
    sessionTimeout: number
    maxLoginAttempts: number
    passwordMinLength: number
    requireTwoFactor: boolean
  }
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
    inApp: boolean
  }
}

const getDynamicApiBase = () => {
  // Priority 1: Use VITE_API_URL if set (for deployment flexibility)
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL
    console.log('🌐 [API] Using VITE_API_URL:', apiUrl)
    return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`
  }
  
  // Fallback: Production domain detection or production URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    // If on production domain, use current domain
    if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
      return `${window.location.protocol}//${window.location.host}/api`
    }
    // For any other domain, always use production URL
    // This ensures we never use local IPs or development URLs in production builds
    return 'https://thenefol.com/api'
  }
  // Default to production API URL
  return 'https://thenefol.com/api'
}

class ConfigService {
  private config: AppConfig = {
    api: {
      baseUrl: getDynamicApiBase(),
      timeout: 30000,
      retries: 3
    },
    features: {
      loyaltyProgram: true,
      affiliateProgram: true,
      cashbackSystem: true,
      emailMarketing: true,
      smsMarketing: true,
      pushNotifications: true,
      whatsappChat: true,
      liveChat: true,
      analytics: true,
      formBuilder: true,
      workflowAutomation: true,
      customerSegmentation: true,
      journeyTracking: true,
      actionableAnalytics: true,
      aiBox: true,
      journeyFunnel: true,
      aiPersonalization: true,
      customAudience: true,
      omniChannel: true,
      apiManager: true
    },
    ui: {
      theme: 'auto',
      language: 'en',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      currency: 'INR'
    },
    security: {
      sessionTimeout: 3600000, // 1 hour
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      requireTwoFactor: false
    },
    notifications: {
      email: true,
      sms: true,
      push: true,
      inApp: true
    }
  }

  // Get entire config
  getConfig(): AppConfig {
    return { ...this.config }
  }

  // Get specific config section
  getSection<K extends keyof AppConfig>(section: K): AppConfig[K] {
    return { ...this.config[section] }
  }

  // Get specific config value
  getValue<K extends keyof AppConfig, T extends keyof AppConfig[K]>(
    section: K,
    key: T
  ): AppConfig[K][T] {
    return this.config[section][key]
  }

  // Update config section
  updateSection<K extends keyof AppConfig>(
    section: K,
    updates: Partial<AppConfig[K]>
  ): void {
    this.config[section] = { ...this.config[section], ...updates }
    this.saveToStorage()
  }

  // Update specific config value
  updateValue<K extends keyof AppConfig, T extends keyof AppConfig[K]>(
    section: K,
    key: T,
    value: AppConfig[K][T]
  ): void {
    this.config[section][key] = value
    this.saveToStorage()
  }

  // Reset config to defaults
  reset(): void {
    this.config = {
      api: {
        baseUrl: getDynamicApiBase(),
        timeout: 30000,
        retries: 3
      },
      features: {
        loyaltyProgram: true,
        affiliateProgram: true,
        cashbackSystem: true,
        emailMarketing: true,
        smsMarketing: true,
        pushNotifications: true,
        whatsappChat: true,
        liveChat: true,
        analytics: true,
        formBuilder: true,
        workflowAutomation: true,
        customerSegmentation: true,
        journeyTracking: true,
        actionableAnalytics: true,
        aiBox: true,
        journeyFunnel: true,
        aiPersonalization: true,
        customAudience: true,
        omniChannel: true,
        apiManager: true
      },
      ui: {
        theme: 'auto',
        language: 'en',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        currency: 'INR'
      },
      security: {
        sessionTimeout: 3600000,
        maxLoginAttempts: 5,
        passwordMinLength: 8,
        requireTwoFactor: false
      },
      notifications: {
        email: true,
        sms: true,
        push: true,
        inApp: true
      }
    }
    this.saveToStorage()
  }

  // Load config from storage
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('nefol_admin_config')
      if (stored) {
        const parsedConfig = JSON.parse(stored)
        this.config = { ...this.config, ...parsedConfig }
      }
    } catch (error) {
      console.error('Failed to load config from storage:', error)
    }
  }

  // Save config to storage
  private saveToStorage(): void {
    try {
      localStorage.setItem('nefol_admin_config', JSON.stringify(this.config))
    } catch (error) {
      console.error('Failed to save config to storage:', error)
    }
  }

  // Check if feature is enabled
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature]
  }

  // Enable/disable feature
  setFeatureEnabled(feature: keyof AppConfig['features'], enabled: boolean): void {
    this.config.features[feature] = enabled
    this.saveToStorage()
  }

  // Get API configuration
  getApiConfig() {
    return this.config.api
  }

  // Get UI configuration
  getUiConfig() {
    return this.config.ui
  }

  // Get security configuration
  getSecurityConfig() {
    return this.config.security
  }

  // Get notifications configuration
  getNotificationsConfig() {
    return this.config.notifications
  }
}

// Create and export a singleton instance
export const configService = new ConfigService()

// Load config from storage on initialization
configService.loadFromStorage()

// Helper function to get API base URL
export function getApiBase(): string {
  return configService.getApiConfig().baseUrl
}

export default configService




