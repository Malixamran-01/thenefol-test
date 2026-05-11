export interface AuthorProfile {
  id: number
  display_name: string | null
  pen_name: string | null
  username: string | null
  profile_image: string | null
  cover_image: string | null
  bio: string | null
  writing_categories: string[] | null
  location: string | null
  is_verified?: boolean
  status?: string
  ban_public_message?: string | null
}

export interface Stats {
  followers: number
  subscribers: number
  following: number
  posts: number
  views: number
  likes: number
  comments: number
  reads: number
  profileViews: number
}

export interface Post {
  id: number
  title: string
  excerpt: string | null
  cover_image: string | null
  status: string
  featured: boolean
  categories: unknown
  views_count: number
  likes_count: number
  comments_count: number
  reposts_count: number
  created_at: string
  updated_at: string
}

export interface Draft {
  id: number
  title: string
  status: string
  updated_at: string
}

export interface MonthlyPoint {
  month: string
  month_date: string
  post_count?: number
  likes?: number
  views?: number
  new_followers?: number
}

export interface Activity {
  id: number
  actor_name: string | null
  actor_avatar: string | null
  type: string
  post_id: string | null
  post_title: string | null
  comment_excerpt: string | null
  is_read: boolean
  created_at: string
}

export interface DashboardData {
  author: AuthorProfile | null
  stats: Stats
  posts: Post[]
  drafts: Draft[]
  monthlyPosts: MonthlyPoint[]
  monthlyLikes: MonthlyPoint[]
  monthlyFollowers: MonthlyPoint[]
  recentActivity: Activity[]
}

export type SortKey =
  | 'created_at'
  | 'views_count'
  | 'likes_count'
  | 'comments_count'
  | 'reposts_count'

export type ChartMetric = 'likes' | 'posts' | 'followers'

export type DashTab = 'overview' | 'posts' | 'growth' | 'program' | 'earnings'
