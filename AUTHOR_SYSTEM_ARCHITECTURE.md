# Author System Architecture

## Overview

This document describes the comprehensive author system implementation for the blog platform, following industry best practices from Substack and Medium.

## Core Principles

### ✅ Separation of Concerns

We maintain clear separation between:
- **Users**: Authentication and basic identity
- **Authors**: Creator profiles and content ownership
- **Publications**: Optional grouping mechanism for content
- **Relationships**: Social graph (followers) vs. content delivery (subscribers)

### ❌ Anti-Patterns Avoided

- Storing everything in a single `users` table
- Mixing followers and subscribers
- Hard deletes without recovery
- Denormalized counts in main tables

## Database Schema

### 1. Users (Existing)
```sql
users
- id (PK)
- email
- password_hash
- name
- role (user | admin | moderator)
- created_at
```

**Purpose**: Authentication and basic account management.

### 2. Author Profiles (NEW)
```sql
author_profiles
- id (PK)
- user_id (FK → users.id, UNIQUE)
- username (unique, @handle)
- display_name
- bio
- profile_image
- cover_image
- website
- location
- is_verified
- status (active | inactive | banned | deleted)
- deleted_at
- recovery_until
- created_at
- updated_at
```

**Purpose**: Creator identity separate from user account.

**Why separate from users?**
- User can exist without being an author
- Author profile can be disabled independently
- Authors have different data requirements (bio, cover image, etc.)
- Clean separation of authentication vs. public profile

### 3. Publications (NEW - Optional)
```sql
publications
- id (PK)
- owner_author_id (FK → author_profiles.id)
- name
- slug (unique)
- description
- logo
- cover_image
- is_paid
- status (active | inactive | deleted)
- created_at
- updated_at
```

**Purpose**: Group blogs, newsletters, team writing.

**Future use cases:**
- Multiple authors contributing to one publication
- Newsletter management
- Brand/company blogs

### 4. Blog Posts (EXTENDED)
```sql
blog_posts
- id (PK)
- author_id (FK → author_profiles.id)  -- NEW
- publication_id (FK → publications.id)  -- NEW
- user_id (FK → users.id)  -- LEGACY (keep for compatibility)
- title
- content
- excerpt
- cover_image
- status (draft | pending | approved | rejected | deleted)
- views_count  -- NEW
- ... (existing fields)
```

**Changes:**
- Added `author_id` for proper author relationship
- Added `publication_id` for future publication support
- Added `views_count` for analytics
- Extended status to include 'draft' and 'deleted'

### 5. Author Followers (NEW)
```sql
author_followers
- id (PK)
- author_id (FK → author_profiles.id)
- follower_user_id (FK → users.id)
- created_at
UNIQUE (author_id, follower_user_id)
```

**Purpose**: Lightweight social graph.

**Use cases:**
- Profile follower count
- Social discovery
- Author recommendations
- Activity feed filtering

### 6. Author Subscriptions (NEW)
```sql
author_subscriptions
- id (PK)
- author_id (FK → author_profiles.id)
- user_id (FK → users.id, nullable)
- email
- type (free | paid)
- status (active | paused | cancelled)
- subscribed_at
- cancelled_at
- created_at
- updated_at
UNIQUE (author_id, user_id)
```

**Purpose**: Email delivery + monetization + legal compliance.

**Why separate from followers?**
| Aspect | Followers | Subscribers |
|--------|-----------|-------------|
| Purpose | Social | Content delivery |
| Email required | ❌ No | ✅ Yes |
| Paid option | ❌ No | ✅ Yes |
| Notifications | Light | Heavy |
| Legal compliance | Low | High (GDPR, CAN-SPAM) |

### 7. Author Stats (NEW - Cached Counters)
```sql
author_stats
- author_id (PK, FK → author_profiles.id)
- followers_count
- subscribers_count
- posts_count
- total_views
- total_likes
- updated_at
```

**Purpose**: Fast reads without expensive COUNT queries.

**How it works:**
- Automatically updated via database triggers
- No manual counter management
- Safe and accurate

### 8. Blog Activities (EXTENDED)
```sql
blog_activities
- id (PK)
- user_id (FK → users.id)
- author_id (FK → author_profiles.id)  -- NEW
- activity_type
- post_id
- comment_id
- metadata (jsonb)
- created_at
```

**Purpose**: Feed algorithm and activity tracking.

## Status Management & Lifecycle

### Author Profile Statuses

| Status | Meaning | Visible to Users? | Can Publish? |
|--------|---------|-------------------|--------------|
| active | Normal state | ✅ Yes | ✅ Yes |
| inactive | Self-disabled | ❌ No | ❌ No |
| banned | Admin action | ❌ No | ❌ No |
| deleted | Soft delete | ❌ No | ❌ No |

### 30-Day Soft Delete & Recovery

When an author deletes their profile:

```sql
UPDATE author_profiles SET
  status = 'deleted',
  deleted_at = NOW(),
  recovery_until = NOW() + INTERVAL '30 days'
WHERE user_id = ?
```

**During 30 days:**
- Profile hidden from public
- Posts hidden (via status check)
- Followers/subscribers preserved
- Subscriptions paused

**Recovery process:**
```sql
UPDATE author_profiles SET
  status = 'active',
  deleted_at = NULL,
  recovery_until = NULL
WHERE user_id = ? AND recovery_until > NOW()
```

**After 30 days (cron job):**
```sql
DELETE FROM author_profiles
WHERE status = 'deleted' AND recovery_until < NOW()
```

This permanently removes the profile and cascades to related data.

## Database Triggers

### Auto-Update Stats

**Follower count:**
```sql
CREATE TRIGGER trg_author_followers_stats
  AFTER INSERT OR DELETE ON author_followers
  FOR EACH ROW EXECUTE PROCEDURE update_author_followers_count()
```

**Subscriber count:**
```sql
CREATE TRIGGER trg_author_subscriptions_stats
  AFTER INSERT OR DELETE ON author_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE update_author_subscribers_count()
```

**Posts count:**
```sql
CREATE TRIGGER trg_blog_posts_stats
  AFTER INSERT OR DELETE ON blog_posts
  FOR EACH ROW EXECUTE PROCEDURE update_author_posts_count()
```

These triggers automatically maintain accurate cached counts without manual intervention.

## API Endpoints

### Author Profile Management

```
GET    /api/blog/authors/:identifier      Get author by username or ID
POST   /api/blog/authors/create           Create author profile (become an author)
PATCH  /api/blog/authors/update           Update author profile
DELETE /api/blog/authors/delete           Soft delete profile (30-day recovery)
POST   /api/blog/authors/restore          Restore deleted profile
POST   /api/blog/authors/cleanup-deleted  Cleanup expired deletes (cron)
```

### Social & Engagement

```
POST   /api/blog/authors/:authorId/follow        Follow author
DELETE /api/blog/authors/:authorId/follow        Unfollow author
POST   /api/blog/authors/:authorId/subscribe     Subscribe to author
DELETE /api/blog/authors/:authorId/subscribe     Unsubscribe from author
```

### Stats & Discovery

```
GET /api/blog/authors/:authorId/stats       Get author stats (followers, subscribers, etc.)
GET /api/blog/authors/:authorId/activity    Get author activity (likes, comments, posts)
GET /api/blog/authors/suggestions           Get suggested authors to follow
```

### Personalized Feed

```
GET /api/blog/feed    Get personalized feed based on followed/subscribed authors
```

## Frontend Integration

### Creating an Author Profile

```typescript
import { blogActivityAPI } from '@/services/api'

// User becomes an author
await blogActivityAPI.createAuthorProfile({
  username: 'johndoe',
  display_name: 'John Doe',
  bio: 'Software engineer and writer',
  profile_image: '/uploads/profile.jpg',
  cover_image: '/uploads/cover.jpg',
  website: 'https://johndoe.com',
  location: 'San Francisco, CA'
})
```

### Following an Author

```typescript
// Follow
await blogActivityAPI.followAuthor(authorId)

// Unfollow
await blogActivityAPI.unfollowAuthor(authorId)
```

### Subscribing to an Author

```typescript
// Subscribe (email delivery)
await blogActivityAPI.subscribeToAuthor(authorId)

// Unsubscribe
await blogActivityAPI.unsubscribeFromAuthor(authorId)
```

### Getting Author Stats

```typescript
const stats = await blogActivityAPI.getAuthorStats(authorId)
// Returns: { followers, subscribers, posts, views, likes, isFollowing, isSubscribed }
```

## Migration Guide

### Running the Migration

```bash
cd backend
node migrate.js
```

This will:
1. Create all new tables (`author_profiles`, `publications`, `author_followers`, `author_subscriptions`, `author_stats`, `blog_activities`)
2. Add new columns to existing tables (`blog_posts.author_id`, `blog_posts.publication_id`, `blog_posts.views_count`)
3. Create all indexes for performance
4. Set up database triggers for auto-stats

### Migrating Existing Data

If you have existing blog posts with `user_id`, you can create author profiles for existing authors:

```sql
-- Create author profiles for all users who have published posts
INSERT INTO author_profiles (user_id, username, display_name, status)
SELECT DISTINCT
  u.id,
  LOWER(REGEXP_REPLACE(u.name, '[^a-zA-Z0-9]', '', 'g')),
  u.name,
  'active'
FROM users u
JOIN blog_posts bp ON u.id::text = bp.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM author_profiles WHERE user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Link existing posts to author profiles
UPDATE blog_posts bp
SET author_id = ap.id
FROM author_profiles ap
WHERE bp.user_id::integer = ap.user_id
  AND bp.author_id IS NULL;
```

## Performance Considerations

### Indexes Created

All critical query paths are indexed:

```sql
-- Author lookups
CREATE INDEX idx_author_profiles_user_id ON author_profiles(user_id)
CREATE INDEX idx_author_profiles_username ON author_profiles(username)
CREATE INDEX idx_author_profiles_status ON author_profiles(status)

-- Social graph
CREATE INDEX idx_author_followers_author ON author_followers(author_id)
CREATE INDEX idx_author_followers_follower ON author_followers(follower_user_id)

-- Subscriptions
CREATE INDEX idx_author_subscriptions_author ON author_subscriptions(author_id)
CREATE INDEX idx_author_subscriptions_user ON author_subscriptions(user_id)
CREATE INDEX idx_author_subscriptions_email ON author_subscriptions(email)
CREATE INDEX idx_author_subscriptions_status ON author_subscriptions(status)

-- Posts
CREATE INDEX idx_blog_posts_author_id ON blog_posts(author_id)
CREATE INDEX idx_blog_posts_publication_id ON blog_posts(publication_id)

-- Activities
CREATE INDEX idx_blog_activities_author ON blog_activities(author_id)
CREATE INDEX idx_blog_activities_date ON blog_activities(created_at DESC)
```

### Query Optimization

1. **Cached Counts**: Use `author_stats` for all count displays (O(1) instead of O(n))
2. **Status Filters**: Always filter by `status = 'active'` for public queries
3. **Pagination**: Use `LIMIT` and `OFFSET` for all list queries
4. **Feed Algorithm**: Optimized union queries with proper indexes

## Security & Privacy

### Authorization Checks

- ✅ Users can only edit their own author profile
- ✅ Authors can't follow/subscribe to themselves
- ✅ Deleted profiles are hidden from public queries
- ✅ Banned authors can't publish or interact

### Data Retention

- ✅ 30-day recovery period for deleted profiles
- ✅ Soft cancellation for subscriptions (audit trail)
- ✅ Activity logs preserved for analytics
- ✅ GDPR-compliant email management

## Future Enhancements

### Publications System (Already prepared)

The database is ready for:
- Team publications
- Multiple authors per publication
- Publication-specific subscriptions
- Newsletter management

### Paid Subscriptions

The `author_subscriptions.type` field supports:
- `free`: Standard email subscription
- `paid`: Premium content access

### Analytics Dashboard

The `author_stats` table can be extended with:
- Daily/weekly/monthly breakdowns
- Engagement rates
- Revenue tracking (for paid subscriptions)

### Verification System

The `author_profiles.is_verified` field is ready for:
- Email verification
- Identity verification
- Platform verification badges

## Comparison with Alternatives

### Why this approach is better than a single table

| Feature | Single Table | Normalized (Our Approach) |
|---------|-------------|---------------------------|
| Scalability | ❌ Poor | ✅ Excellent |
| Query performance | ❌ Slow with growth | ✅ Fast (indexed) |
| Feature additions | ❌ Complex migrations | ✅ Easy extensions |
| Analytics | ❌ Expensive queries | ✅ Pre-computed stats |
| Moderation | ❌ Messy status flags | ✅ Clean status management |
| Email compliance | ❌ Hard to track | ✅ Proper subscriber records |

## Testing Checklist

- [ ] Create author profile
- [ ] Update author profile
- [ ] Follow/unfollow authors
- [ ] Subscribe/unsubscribe to authors
- [ ] View author stats (cached counts)
- [ ] View author activity feed
- [ ] View personalized feed
- [ ] Soft delete profile
- [ ] Restore deleted profile (within 30 days)
- [ ] Verify expired profiles are cleaned up
- [ ] Verify triggers update stats correctly
- [ ] Test authorization (can't edit other profiles)
- [ ] Test self-follow prevention
- [ ] Test banned author restrictions

## Support & Troubleshooting

### Common Issues

**Q: Follower count not updating?**
A: Check that database triggers are installed correctly. Run `node migrate.js` again.

**Q: Can't create author profile (username taken)?**
A: Username must be unique. Choose a different username.

**Q: Deleted profile can't be restored?**
A: Recovery is only available for 30 days. After that, the profile is permanently deleted.

**Q: Stats showing zero despite followers?**
A: Run `SELECT * FROM author_stats WHERE author_id = ?` to check if stats exist. If not, manually insert or trigger a follow/unfollow to initialize.

---

**Last Updated**: February 10, 2026  
**Version**: 1.0  
**Database**: PostgreSQL 12+  
**Backend**: Node.js + Express + TypeScript
