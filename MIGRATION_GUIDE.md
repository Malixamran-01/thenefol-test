# Quick Migration Guide

## 🚀 Get Started in 3 Steps

### Step 1: Run Database Migration

```bash
cd backend
node migrate.js
```

**Expected Output:**
```
Connected to database: your_database
Creating tables...
Creating indexes...
Database initialization complete!
```

This creates:
- 6 new tables (author_profiles, publications, author_followers, author_subscriptions, author_stats, blog_activities)
- New columns in blog_posts (author_id, publication_id, views_count)
- 15+ indexes for performance
- 3 database triggers for auto-updating stats

### Step 2: (Optional) Migrate Existing Data

If you have existing blog posts, link them to author profiles:

```bash
cd backend
psql -U your_username -d your_database -f migrations/link_existing_posts.sql
```

Or manually run in PostgreSQL:

```sql
-- Create author profiles for existing authors
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

### Step 3: Restart Your Server

```bash
cd backend
npm run dev
```

**Done!** Your author system is now live.

## 🎯 Quick Test

### Test in Browser Console

```javascript
// Get author profile
const author = await fetch('/api/blog/authors/1').then(r => r.json())
console.log(author)

// Create author profile (requires authentication)
const newAuthor = await fetch('/api/blog/authors/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    username: 'johndoe',
    display_name: 'John Doe',
    bio: 'Software engineer and writer'
  })
}).then(r => r.json())
console.log(newAuthor)

// Follow author
const follow = await fetch('/api/blog/authors/1/follow', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
}).then(r => r.json())
console.log(follow)

// Get author stats
const stats = await fetch('/api/blog/authors/1/stats').then(r => r.json())
console.log(stats) // { followers, subscribers, posts, views, likes, isFollowing, isSubscribed }
```

### Test in Database

```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'author%'
ORDER BY table_name;

-- Check triggers installed
SELECT tgname FROM pg_trigger 
WHERE tgname LIKE 'trg_author%';

-- Check author profiles
SELECT id, username, display_name, status 
FROM author_profiles 
LIMIT 5;

-- Check stats table
SELECT * FROM author_stats LIMIT 5;
```

## 📝 Next Steps

### 1. Update Frontend Components

Update `AuthorProfile.tsx` to use new API:

```typescript
import { blogActivityAPI } from '@/services/api'

// Fetch author data
const author = await blogActivityAPI.getAuthor(authorId)

// Get stats
const stats = await blogActivityAPI.getAuthorStats(authorId)
```

### 2. Add Author Profile Creation

Create a page/form for users to become authors:

```typescript
const handleCreateProfile = async (data) => {
  try {
    await blogActivityAPI.createAuthorProfile({
      username: data.username,
      display_name: data.name,
      bio: data.bio,
      profile_image: uploadedImageUrl,
      cover_image: uploadedCoverUrl
    })
    toast.success('Author profile created!')
  } catch (error) {
    toast.error('Failed to create profile')
  }
}
```

### 3. Add Follow/Subscribe Buttons

Already implemented in `AuthorProfile.tsx`, just ensure you're using the correct `authorId`:

```typescript
const handleFollow = async () => {
  if (isFollowing) {
    await blogActivityAPI.unfollowAuthor(authorId)
  } else {
    await blogActivityAPI.followAuthor(authorId)
  }
  // Refresh stats
  const newStats = await blogActivityAPI.getAuthorStats(authorId)
  // Update UI...
}
```

### 4. Display Personalized Feed

Create a feed page:

```typescript
const FeedPage = () => {
  const [feed, setFeed] = useState([])

  useEffect(() => {
    async function loadFeed() {
      const data = await blogActivityAPI.getPersonalizedFeed(30, 0)
      setFeed(data)
    }
    loadFeed()
  }, [])

  return (
    <div>
      {feed.map(activity => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  )
}
```

### 5. Add Author Suggestions

Create a discovery page:

```typescript
const DiscoverAuthors = () => {
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    async function loadSuggestions() {
      const data = await blogActivityAPI.getAuthorSuggestions(10)
      setSuggestions(data)
    }
    loadSuggestions()
  }, [])

  return (
    <div>
      {suggestions.map(author => (
        <AuthorCard key={author.author_id} author={author} />
      ))}
    </div>
  )
}
```

## 🔧 Troubleshooting

### Migration fails

**Check PostgreSQL version:**
```bash
psql --version
```
Requires PostgreSQL 12+

**Check database connection:**
```bash
cd backend
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
```

### Triggers not working

**Reinstall triggers:**
```bash
cd backend
node migrate.js
```

**Manually check:**
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE 'trg_author%';
```

### Stats showing zero

**Initialize stats manually:**
```sql
-- For a specific author
INSERT INTO author_stats (author_id, followers_count, subscribers_count, posts_count)
SELECT 
  ap.id,
  COUNT(DISTINCT af.id) as followers_count,
  COUNT(DISTINCT asub.id) as subscribers_count,
  COUNT(DISTINCT bp.id) as posts_count
FROM author_profiles ap
LEFT JOIN author_followers af ON ap.id = af.author_id
LEFT JOIN author_subscriptions asub ON ap.id = asub.author_id AND asub.status = 'active'
LEFT JOIN blog_posts bp ON ap.id = bp.author_id
WHERE ap.id = 1
GROUP BY ap.id
ON CONFLICT (author_id) DO UPDATE SET
  followers_count = EXCLUDED.followers_count,
  subscribers_count = EXCLUDED.subscribers_count,
  posts_count = EXCLUDED.posts_count;
```

## 📚 Documentation

For more details:

- **Architecture**: See `AUTHOR_SYSTEM_ARCHITECTURE.md`
- **Implementation**: See `IMPLEMENTATION_SUMMARY.md`
- **API Reference**: See comments in `backend/src/routes/blogActivity.ts`
- **Database Schema**: See `backend/migrate.js`

## ✅ Verification Checklist

After migration, verify:

- [ ] Database tables created
- [ ] Indexes created
- [ ] Triggers installed
- [ ] Backend starts without errors
- [ ] Can create author profile via API
- [ ] Can follow/unfollow authors
- [ ] Can subscribe/unsubscribe to authors
- [ ] Stats update automatically
- [ ] Frontend components work

## 🎉 You're Done!

Your author system is now fully functional with:

✅ Proper database normalization  
✅ Cached stats for performance  
✅ Followers vs. subscribers separation  
✅ 30-day soft delete & recovery  
✅ Status management (active, inactive, banned, deleted)  
✅ Personalized feed algorithm  
✅ Author suggestions  
✅ Activity tracking  

Start building your author features!
