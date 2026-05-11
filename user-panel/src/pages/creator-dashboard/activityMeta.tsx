import React from 'react'
import { Heart, MessageCircle, Repeat2, Star, UserPlus } from 'lucide-react'
import type { Activity } from './types'

export const ACTIVITY_META: Record<
  string,
  { icon: React.ReactNode; dot: string; label: (a: Activity) => string }
> = {
  followed: {
    icon: <UserPlus className="h-3 w-3" />,
    dot: 'bg-[#1B4965]',
    label: () => 'started following you',
  },
  subscribed: {
    icon: <Star className="h-3 w-3" />,
    dot: 'bg-amber-500',
    label: () => 'subscribed to you',
  },
  post_liked: {
    icon: <Heart className="h-3 w-3" />,
    dot: 'bg-rose-500',
    label: (a) => `liked "${a.post_title ?? 'your post'}"`,
  },
  post_commented: {
    icon: <MessageCircle className="h-3 w-3" />,
    dot: 'bg-[#4B97C9]',
    label: (a) => `commented on "${a.post_title ?? 'your post'}"`,
  },
  post_reposted: {
    icon: <Repeat2 className="h-3 w-3" />,
    dot: 'bg-emerald-500',
    label: (a) => `reposted "${a.post_title ?? 'your post'}"`,
  },
  comment_liked: {
    icon: <Heart className="h-3 w-3" />,
    dot: 'bg-rose-400',
    label: () => 'liked your comment',
  },
  comment_replied: {
    icon: <MessageCircle className="h-3 w-3" />,
    dot: 'bg-[#4B97C9]',
    label: () => 'replied to your comment',
  },
}
