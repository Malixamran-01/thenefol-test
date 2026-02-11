# Author User Flow & Product Logic

## Overview

This document describes the complete end-to-end user flow for our platform, designed to feel natural, non-intrusive, and Substack-like without confusing pure buyers.

**Core Principle**: Every author must be a user, but not every user must be an author. Authorhood is an opt-in capability, not a forced identity.

## 1️⃣ Core Identity Model

### Base Rule

✅ **One account system**  
✅ **One User**  
✅ **Optional roles/capabilities layered on top**

### User Roles (Not separate accounts)

| Role | Description | Access Level |
|------|-------------|--------------|
| **USER** | Default (buyer/reader) | View content, shop, read blogs |
| **AUTHOR** | Opt-in creator | Write, publish, manage content |
| **PUBLICATION_OWNER** | Optional extension | Manage publications, team writing |

**Internally**: Role flags in `users.roles[]`, not separate user tables.

## 2️⃣ Entry Points into the System

You have **3 natural entry paths** into the platform:

### A. Shopper-first users
- Land on product pages
- Create account to buy
- **Never touch blogs → no friction**

### B. Reader-first users
- Discover blogs
- Read without login
- Login only when:
  - Subscribing
  - Liking
  - Commenting
  - Bookmarking

### C. Creator-first users
- Click "Write" / "Submit blog"
- **Forced login**
- Then author onboarding begins

## 3️⃣ Account Creation (Unified & Neutral)

### Signup (Same for everyone)

Minimal and neutral:
- Email / OAuth
- Password
- Name (optional)
- Username (for system use)

🚫 **DO NOT ask about blogging here**  
This avoids overwhelming buyers.

**Database:**
```sql
INSERT INTO users (email, password, name, roles)
VALUES ($1, $2, $3, ARRAY['USER']::text[])
```

## 4️⃣ First Author Touchpoint (Trigger-Based)

### Trigger Moments

User clicks:
- "Write a blog"
- "Become a writer"
- "Create publication"
- "Submit story"

**Now the magic happens** 👇

## 5️⃣ Author Onboarding Flow (Critical UX)

### Step 0: Gentle Prompt (Not Forced)

```
✨ "Looks like you want to publish content."

Options:
✅ Create Author Profile
➡️ Continue without author profile (disabled or read-only)
```

⚠️ You should not allow publishing without an author profile, but this wording makes it feel **optional, not forced**.

## 6️⃣ Author Profile Creation (Substack-like)

### Step 1: Identity
**API Endpoint**: `POST /api/authors/onboarding/step1`

Fields:
- Pen name / Display name
- Author username (URL-based) - e.g., `@malikwrites`
- Profile picture
- Optional real name (private)

```json
{
  "username": "malikwrites",
  "display_name": "Malik Ahmed",
  "pen_name": "M. Ahmed",
  "real_name": "Malik Ahmed Khan",
  "profile_image": "url/to/image"
}
```

### Step 2: About the Author
**API Endpoint**: `POST /api/authors/onboarding/step2`

Fields:
- Bio (Markdown supported)
- Writing interests/categories:
  - Tech
  - Mental health
  - Diaries
  - Business
  - Poetry
- Writing language(s)

```json
{
  "bio": "Writer exploring technology and mental health",
  "writing_categories": ["Tech", "Mental health"],
  "writing_languages": ["English", "Urdu"],
  "location": "Karachi, Pakistan"
}
```

### Step 3: Social Presence (Optional)
**API Endpoint**: `POST /api/authors/onboarding/step3`

Fields:
- Twitter/X
- Instagram
- LinkedIn
- Personal website
- Email visibility toggle

```json
{
  "website": "https://malikwrites.com",
  "social_links": {
    "twitter": "@malikwrites",
    "instagram": "@malik.writes",
    "linkedin": "malik-ahmed"
  },
  "email_visible": false
}
```

### Step 4: Author Preferences
**API Endpoint**: `POST /api/authors/onboarding/step4`

Settings:
- Allow comments?
- Allow email subscriptions?
- Allow paid subscriptions? (future-proof)
- Show products on author page? (cross-sell ecommerce 🔥)

```json
{
  "preferences": {
    "allow_comments": true,
    "allow_subscriptions": true,
    "allow_paid_subscriptions": false,
    "show_products": true
  }
}
```

### Step 5: Review & Activate
**API Endpoint**: `POST /api/authors/onboarding/complete`

```
🎉 "Your author profile is ready."
```

User now has:
- ✅ USER role
- ✅ AUTHOR role

**Backend Action**:
```sql
UPDATE users SET roles = array_append(roles, 'AUTHOR') WHERE id = $1;
UPDATE author_profiles SET onboarding_completed = true WHERE user_id = $1;
```

## 7️⃣ Publication Creation Flow (Optional, but Powerful)

### Publications ≠ mandatory

Think of them as:
- Diaries
- Columns
- Labels
- Brands

### Trigger

"Create a publication"  
OR  
While publishing a blog → "Publish under publication?"

### Publication Setup

**Step 1: Basics**
- Publication name
- Slug
- Description
- Cover image
- Category

**Step 2: Ownership**
- Owner = current author
- Allow co-authors? (future)

**Step 3: Subscription Model**
- Free
- Paid
- Mixed
- Email notifications ON/OFF

## 8️⃣ Writing & Publishing Flow

### Click "Write"

Editor opens → Then:

**Choose publishing context:**
- Publish as Individual Author
- Publish under Publication

**Editor features:**
- Title
- Subtitle / excerpt
- Cover image (16:9)
- Rich markdown editor
- Tags

**Visibility:**
- Public
- Subscribers only
- Draft

## 9️⃣ Reader → Subscriber Flow

On blog / publication page:

**"Subscribe"** button

- Email notifications
- Optional paid tiers later

**Subscriptions are tied to:**
- Author
- OR Publication

## 🔟 Author Profile Page Structure

Like Substack, but better:

### Sections:
1. Author bio
2. Publications owned
3. Recent posts
4. Categories
5. **Products sold by author** (optional ecommerce tie-in)
6. Subscribe button

## 1️⃣1️⃣ Ecommerce Integration (Very Smart Opportunity)

You can subtly merge both worlds:

### Examples:
- Author sells merch / digital products
- Blog post → "Related products"
- Author dashboard:
  - Blog stats
  - Subscribers
  - **Sales**

**This makes your platform unique**, not just another blog site.

## 1️⃣2️⃣ Dashboard Design (Role-Based)

### User Dashboard
- Orders
- Addresses
- Wishlist
- Saved blogs

### Author Dashboard (appears after onboarding)
- Posts
- Drafts
- Subscribers
- Publications
- Earnings
- Analytics

## 1️⃣3️⃣ Database Logic (High-Level)

```
User
 ├── id
 ├── email
 ├── roles [USER, AUTHOR, ADMIN]
 └── profile

AuthorProfile
 ├── userId
 ├── username
 ├── display_name
 ├── pen_name
 ├── bio
 ├── writing_categories
 ├── social_links
 ├── preferences
 └── onboarding_completed

Publication
 ├── ownerAuthorId
 ├── name
 ├── description
 ├── subscription_model
 └── allow_co_authors

PublicationCoAuthors
 ├── publicationId
 ├── authorId
 └── role (owner, editor, contributor)

Post
 ├── authorId
 ├── publicationId (nullable)
 ├── content
 ├── visibility
 └── status
```

## 1️⃣4️⃣ Why This Flow Works

✔ **Buyers are never bothered**  
✔ **Writers feel intentional & respected**  
✔ **No identity confusion**  
✔ **Clean scaling to paid newsletters**  
✔ **Strong creator economy foundation**  
✔ **Seamless ecommerce crossover**

## API Endpoints Summary

### Author Onboarding

```
GET  /api/authors/check-eligibility       # Check if user can become author
POST /api/authors/onboarding/step1        # Identity (username, name, image)
POST /api/authors/onboarding/step2        # About (bio, categories, languages)
POST /api/authors/onboarding/step3        # Social (links, website, email visibility)
POST /api/authors/onboarding/step4        # Preferences (comments, subscriptions, products)
POST /api/authors/onboarding/complete     # Mark complete & add AUTHOR role
GET  /api/authors/onboarding/progress     # Get current onboarding status
```

### Author Profile Management

```
GET    /api/blog/authors/:identifier      # Get author by username or ID
PATCH  /api/blog/authors/update           # Update author profile
DELETE /api/blog/authors/delete           # Soft delete (30-day recovery)
POST   /api/blog/authors/restore          # Restore deleted profile
```

### Publications (Future)

```
POST /api/publications/create             # Create new publication
GET  /api/publications/:slug              # Get publication details
POST /api/publications/:id/co-authors     # Add co-author
```

## Implementation Status

### ✅ Completed
- [x] Users table with roles array
- [x] Author profiles with comprehensive fields
- [x] Publications with co-author support
- [x] Role-based middleware (`requireRole`, `requireAuthorProfile`)
- [x] Author onboarding API (5-step flow)
- [x] Onboarding progress tracking
- [x] Database triggers for stats

### 🔨 In Progress
- [ ] Author onboarding UI (multi-step wizard)
- [ ] "Become a Writer" trigger buttons
- [ ] Role-based dashboards

### 📋 Todo
- [ ] Publication creation UI
- [ ] Writing & publishing flow UI
- [ ] Reader-to-subscriber flow UI
- [ ] Author dashboard analytics
- [ ] Ecommerce integration on author pages

## Testing the Flow

### 1. Check Eligibility
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/authors/check-eligibility
```

### 2. Start Onboarding - Step 1
```bash
curl -X POST http://localhost:5000/api/authors/onboarding/step1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "display_name": "John Doe",
    "pen_name": "J. Doe",
    "profile_image": "https://example.com/image.jpg"
  }'
```

### 3. Continue through steps 2-5...

### 4. Check Progress
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/authors/onboarding/progress
```

## Frontend Integration Guide

### Example: Become a Writer Button

```tsx
const BecomeWriterButton = () => {
  const navigate = useNavigate()
  
  const handleBecomeWriter = async () => {
    // Check eligibility
    const response = await fetch('/api/authors/check-eligibility', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await response.json()
    
    if (data.hasAuthorProfile && data.onboardingCompleted) {
      // Already an author, go to dashboard
      navigate('/author/dashboard')
    } else if (data.hasAuthorProfile) {
      // Resume onboarding
      navigate('/author/onboarding', { state: { resume: true } })
    } else {
      // Start fresh
      navigate('/author/onboarding')
    }
  }
  
  return (
    <button onClick={handleBecomeWriter}>
      ✨ Become a Writer
    </button>
  )
}
```

---

**Last Updated**: February 11, 2026  
**Version**: 2.0  
**Status**: Backend Complete, Frontend In Progress
