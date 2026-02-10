# Blog Activity & Feed System Implementation Guide

## Overview
This system tracks author activities (likes, comments, posts) and surfaces them to subscribers' feeds, creating an engaging, personalized content discovery experience.

## Backend Setup

### 1. Database Migration
Run the consolidated migration script to create all necessary tables:

```bash
cd backend
node migrate.js
```

**New Tables Created:**
- `blog_author_followers` - Track author followers
- `blog_author_subscribers` - Track author subscribers
- `blog_activities` - General activity tracking for feed algorithm
- Performance indexes on all blog-related tables

**Note:** The migration script is idempotent - it's safe to run multiple times. It will only create tables and indexes that don't already exist.

### 2. Backend Files Created

**New Router: `backend/src/routes/blogActivity.ts`**
- Follow/unfollow authors
- Subscribe/unsubscribe to authors  
- Get author stats (followers, subscribers)
- Get author activity timeline
- Get personalized feed for users
- Get author suggestions

**Already Updated: `backend/src/index.ts`**
- Imported and initialized `blogActivityRouter`
- Registered routes under `/api/blog`

### 3. API Endpoints

#### Author Actions
- `POST /api/blog/authors/:authorId/follow` - Follow an author
- `DELETE /api/blog/authors/:authorId/follow` - Unfollow an author
- `POST /api/blog/authors/:authorId/subscribe` - Subscribe to author
- `DELETE /api/blog/authors/:authorId/subscribe` - Unsubscribe from author

#### Author Data
- `GET /api/blog/authors/:authorId/stats` - Get follower/subscriber counts + user's follow/subscribe status
- `GET /api/blog/authors/:authorId/activity?limit=20&offset=0` - Get author's activity timeline

#### Personalized Feed
- `GET /api/blog/feed?limit=30&offset=0` - Get personalized feed showing activities from followed/subscribed authors
- `GET /api/blog/authors/suggestions?limit=10` - Get suggested authors to follow

## Frontend Setup

### 1. API Service Updated

**File: `user-panel/src/services/api.ts`**

New `blogActivityAPI` export with methods:
- `followAuthor(authorId)`
- `unfollowAuthor(authorId)`
- `subscribeToAuthor(authorId)`
- `unsubscribeFromAuthor(authorId)`
- `getAuthorStats(authorId)`
- `getAuthorActivity(authorId, limit, offset)`
- `getPersonalizedFeed(limit, offset)`
- `getAuthorSuggestions(limit)`

### 2. Author Profile Updated

**File: `user-panel/src/pages/AuthorProfile.tsx`**

**New Features:**
- Real-time follower/subscriber counts from backend
- Server-backed follow/subscribe actions
- Activity tab shows real author activities:
  - Posts they published
  - Posts they liked
  - Posts they commented on
- Activities link to the actual posts

**UI Improvements:**
- Clean layout with no overlapping elements
- Professional stats cards
- Smooth tab navigation
- Loading states for activities

## Activity Types Tracked

### 1. Published Posts
- Shows when author publishes new content
- Displays post title, excerpt, stats

### 2. Liked Posts
- Shows posts the author liked
- Helps subscribers discover related content
- Shows original post author

### 3. Commented Posts
- Shows posts where author left comments
- Displays comment preview
- Links to full post discussion

## Feed Algorithm

The personalized feed algorithm works as follows:

1. **Get User's Followed/Subscribed Authors**
   - Fetches all authors the user follows or subscribes to

2. **Aggregate Activities**
   - Collects recent activities from these authors:
     - New posts published
     - Posts they liked
     - Posts they commented on

3. **Sort by Recency**
   - Activities sorted by timestamp (newest first)
   - Prevents feed staleness

4. **Fallback Content**
   - If user doesn't follow anyone, shows popular/trending posts
   - Based on like count, comment count, and recency

5. **Pagination**
   - Supports infinite scroll via limit/offset
   - Default: 30 items per page

## Usage Examples

### Follow an Author (Frontend)
```typescript
import { blogActivityAPI } from '../services/api'

const handleFollow = async (authorId: string) => {
  try {
    const result = await blogActivityAPI.followAuthor(authorId)
    console.log(`Author now has ${result.followerCount} followers`)
  } catch (error) {
    console.error('Failed to follow:', error)
  }
}
```

### Get Personalized Feed
```typescript
const fetchFeed = async () => {
  try {
    const activities = await blogActivityAPI.getPersonalizedFeed(30, 0)
    // activities contains:
    // - activity_type: 'author_liked' | 'author_commented' | 'author_published'
    // - actor_name: name of author who performed action
    // - post_title: title of post
    // - activity_date: when it happened
    setFeedItems(activities)
  } catch (error) {
    console.error('Failed to load feed:', error)
  }
}
```

### Get Author Activity
```typescript
const fetchAuthorActivity = async (authorId: string) => {
  try {
    const activities = await blogActivityAPI.getAuthorActivity(authorId, 10, 0)
    // Shows what this author has been up to
    displayActivities(activities)
  } catch (error) {
    console.error('Failed to load activities:', error)
  }
}
```

## Manual Fix Needed

In `user-panel/src/pages/AuthorProfile.tsx`, replace the `activityFeed` useMemo (around line 306) with:

```typescript
const activityFeed = useMemo(() => {
  if (activities.length > 0) {
    return activities.map((activity) => {
      let headline = ''
      let summary = ''
      
      if (activity.activity_type === 'published_post') {
        headline = `Published "${activity.post_title}"`
        summary = `New post by ${resolvedAuthor.name}`
      } else if (activity.activity_type === 'liked_post') {
        headline = `Liked "${activity.post_title}"`
        summary = `by ${activity.post_author_name || 'Unknown Author'}`
      } else if (activity.activity_type === 'commented_on_post') {
        headline = `Commented on "${activity.post_title}"`
        summary = activity.comment_content 
          ? `"${activity.comment_content.slice(0, 100)}${activity.comment_content.length > 100 ? '...' : ''}"`
          : `by ${activity.post_author_name || 'Unknown Author'}`
      }
      
      return {
        id: activity.post_id,
        headline,
        summary,
        date: formatDate(activity.activity_date),
        type: activity.activity_type,
        postId: activity.post_id
      }
    })
  }
  
  // Fallback to post-based activity
  return posts.slice(0, 5).map((post, index) => ({
    id: post.id,
    headline:
      index === 0
        ? `Published "${post.title}"`
        : index % 2 === 0
          ? `Updated readers on "${post.title}"`
          : `Post gained fresh engagement on "${post.title}"`,
    summary: `${post.likes_count ?? 0} likes • ${post.comments_count ?? 0} comments • ${Math.max(
      1,
      Math.round((post.views_count ?? 150) / 10)
    )} min engagement`,
    date: formatDate(post.updated_at || post.created_at),
    type: 'published_post',
    postId: post.id
  }))
}, [activities, posts, resolvedAuthor.name])
```

## Testing

1. **Create test users and authors**
2. **Follow some authors**
3. **Have authors like/comment on posts**
4. **Check Activity tab** - should show real activities
5. **Check personalized feed** - should show activities from followed authors
6. **Test subscribe functionality** - should update counts in real-time

## Benefits

✅ **Engagement**: Users discover content through trusted authors  
✅ **Personalization**: Feed tailored to user's interests  
✅ **Community**: Builds connections between authors and readers  
✅ **Discovery**: Surfaces quality content through social proof  
✅ **Retention**: Keeps users coming back to see what authors they follow are doing  

## Next Steps

1. **Run database migration**: `cd backend && node migrate.js`
2. **Restart backend server**: `npm run dev` or `npm start`
3. **Apply manual fix** to `AuthorProfile.tsx` (see Manual Fix section above)
4. **Test follow/subscribe** functionality
5. **Test activity feed** display
6. **Monitor performance** with the new indexes

---

**Note**: The system gracefully falls back to local state if API calls fail, ensuring a smooth user experience even during network issues.
