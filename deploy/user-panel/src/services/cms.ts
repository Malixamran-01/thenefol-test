import { getApiBase } from '../utils/apiBase'

export interface CMSPage {
  id: number
  page_name: string
  page_title: string
  page_subtitle: string
  meta_description: string
  created_at: string
  updated_at: string
}

export interface CMSSection {
  id: number
  page_name: string
  section_key: string
  section_title: string
  section_type: string
  content: any
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CMSPageData {
  page: CMSPage | null
  sections: CMSSection[]
}

class CMSService {
  private apiBase: string

  constructor() {
    const baseUrl = getApiBase().replace(/\/$/, '')
    this.apiBase = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`
  }

  /**
   * Get page content with all sections
   */
  async getPageContent(pageName: string): Promise<CMSPageData> {
    try {
      const response = await fetch(`${this.apiBase}/cms/pages/${pageName}`)
      if (!response.ok) {
        throw new Error('Failed to fetch page content')
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error('CMS Error:', error)
      return { page: null, sections: [] }
    }
  }

  /**
   * Get a specific section by key
   */
  async getSection(pageName: string, sectionKey: string): Promise<CMSSection | null> {
    try {
      const { sections } = await this.getPageContent(pageName)
      return sections.find(s => s.section_key === sectionKey) || null
    } catch (error) {
      console.error('CMS Error:', error)
      return null
    }
  }

  /**
   * Get all sections for a page
   */
  async getSections(pageName: string): Promise<CMSSection[]> {
    try {
      const response = await fetch(`${this.apiBase}/cms/sections/${pageName}`)
      if (!response.ok) {
        throw new Error('Failed to fetch sections')
      }
      const data = await response.json()
      return data.filter((s: CMSSection) => s.is_active)
    } catch (error) {
      console.error('CMS Error:', error)
      return []
    }
  }

  /**
   * Get all available pages
   */
  async getAllPages(): Promise<CMSPage[]> {
    try {
      const response = await fetch(`${this.apiBase}/cms/pages`)
      if (!response.ok) {
        throw new Error('Failed to fetch pages')
      }
      return await response.json()
    } catch (error) {
      console.error('CMS Error:', error)
      return []
    }
  }

  /**
   * Get CMS settings
   */
  async getSettings(): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.apiBase}/cms/settings`)
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }
      return await response.json()
    } catch (error) {
      console.error('CMS Error:', error)
      return {}
    }
  }

  /**
   * Get a specific setting value
   */
  async getSetting(key: string, defaultValue: any = null): Promise<any> {
    try {
      const settings = await this.getSettings()
      return settings[key] !== undefined ? settings[key] : defaultValue
    } catch (error) {
      console.error('CMS Error:', error)
      return defaultValue
    }
  }
}

export const cmsService = new CMSService()
export default cmsService

