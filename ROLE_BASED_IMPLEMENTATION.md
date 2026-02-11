# Role-Based Author System Implementation

## ✅ What's Been Implemented (Backend Complete)

### 1. Database Schema ✅

**Users Table Enhanced:**
```sql
-- Added roles array to users
roles text[] default ARRAY['USER']::text[]
```

**Author Profiles Extended:**
```sql
-- Comprehensive author profile with onboarding tracking
- pen_name
- real_name
- writing_categories[]
- writing_languages[]
- social_links (jsonb)
- preferences (jsonb)
- onboarding_completed (boolean)
- email_visible (boolean)
```

**Publications with Co-Authors:**
```sql
-- Publications table
- subscription_model (free, paid, mixed)
- email_notifications
- allow_co_authors

-- Publication co-authors table
- publication_id
- author_id
- role (owner, editor, contributor)
```

### 2. Role-Based Middleware ✅

**File**: `backend/src/middleware/roleCheck.ts`

**Features:**
- `requireRole('AUTHOR')` - Check if user has specific role
- `requireAuthorProfile()` - Check if user has active author profile
- `addRoleToUser()` - Helper to add roles
- `removeRoleFromUser()` - Helper to remove roles

**Usage Example:**
```typescript
// Protect route - require AUTHOR role
router.post('/publish', authenticateToken, requireRole('AUTHOR'), async (req, res) => {
  // Only users with AUTHOR role can access
})

// Protect route - require author profile
router.post('/edit-post', authenticateToken, requireAuthorProfile, async (req, res) => {
  // Only users with active author profile can access
})
```

### 3. Author Onboarding API ✅

**File**: `backend/src/routes/authorOnboarding.ts`

**Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/authors/check-eligibility` | GET | Check if user can become author |
| `/api/authors/onboarding/step1` | POST | Identity (username, name, image) |
| `/api/authors/onboarding/step2` | POST | About (bio, categories, languages) |
| `/api/authors/onboarding/step3` | POST | Social (links, website) |
| `/api/authors/onboarding/step4` | POST | Preferences (comments, subscriptions) |
| `/api/authors/onboarding/complete` | POST | Complete & activate author role |
| `/api/authors/onboarding/progress` | GET | Get onboarding progress |

**Features:**
- ✅ Multi-step wizard flow
- ✅ Save progress at each step
- ✅ Resume onboarding
- ✅ Automatic role assignment on completion
- ✅ Progress tracking (0-100%)

### 4. Registered Routes ✅

**File**: `backend/src/index.ts`

```typescript
// Initialize role-based access control
initRoleCheck(pool)

// Author onboarding routes
initAuthorOnboardingRouter(pool)
app.use('/api/authors', authorOnboardingRouter)
```

## 🔨 What's Next (Frontend & Polish)

### 1. Frontend: Author Onboarding UI

**File to Create**: `user-panel/src/pages/AuthorOnboarding.tsx`

**Features Needed:**
- Multi-step wizard UI
- Step 1: Username, display name, profile image uploader
- Step 2: Bio textarea (markdown), category checkboxes, language selector
- Step 3: Social links inputs (Twitter, Instagram, LinkedIn), website input
- Step 4: Preference toggles (comments, subscriptions, products)
- Step 5: Review & confirm screen
- Progress indicator (steps 1-5)
- Save & continue later functionality
- Beautiful, Substack-inspired design

### 2. Frontend: Trigger Buttons

**Where to Add:**

**Navbar** (for logged-in users):
```tsx
{!isAuthor && (
  <button onClick={() => navigate('/author/onboarding')}>
    ✨ Become a Writer
  </button>
)}
```

**Blog Page** (empty state):
```tsx
<div className="text-center py-16">
  <h2>Share Your Story</h2>
  <p>Start your writing journey today</p>
  <button onClick={handleBecomeWriter}>
    Start Writing
  </button>
</div>
```

**User Profile Dropdown**:
```tsx
{isAuthor ? (
  <Link to="/author/dashboard">Author Dashboard</Link>
) : (
  <button onClick={() => navigate('/author/onboarding')}>
    Become a Writer
  </button>
)}
```

### 3. Frontend: Role-Based Dashboards

**User Dashboard** (`/dashboard`):
- Orders
- Addresses
- Wishlist
- Saved blogs
- **Show "Become a Writer" CTA if not author**

**Author Dashboard** (`/author/dashboard`):
- Posts (published, drafts)
- Subscribers count
- Publications (if any)
- Analytics (views, likes, comments)
- Writing tools (new post, new publication)
- **Show ecommerce section if enabled in preferences**

### 4. Frontend: API Service Layer

**File to Create**: `user-panel/src/services/authorAPI.ts`

```typescript
export const authorAPI = {
  // Onboarding
  async checkEligibility() { /* ... */ },
  async startOnboardingStep1(data) { /* ... */ },
  async continueOnboardingStep2(data) { /* ... */ },
  async continueOnboardingStep3(data) { /* ... */ },
  async continueOnboardingStep4(data) { /* ... */ },
  async completeOnboarding() { /* ... */ },
  async getProgress() { /* ... */ },
  
  // Publications
  async createPublication(data) { /* ... */ },
  async getMyPublications() { /* ... */ },
  async addCoAuthor(publicationId, authorId) { /* ... */ }
}
```

## 📋 Implementation Checklist

### Backend ✅ (Complete)
- [x] Add roles to users table
- [x] Extend author_profiles with onboarding fields
- [x] Create publications co-authors table
- [x] Create role-based middleware
- [x] Create author onboarding API (5 steps)
- [x] Add progress tracking
- [x] Register routes in index.ts
- [x] Run database migration

### Frontend 🔨 (To Do)
- [ ] Create AuthorOnboarding wizard component
- [ ] Add "Become a Writer" buttons throughout app
- [ ] Create role-based dashboard router
- [ ] Build Author Dashboard UI
- [ ] Update User Dashboard with author CTA
- [ ] Create authorAPI service
- [ ] Add onboarding progress indicator
- [ ] Style with Substack-inspired design

### Testing 🧪 (To Do)
- [ ] Test full onboarding flow
- [ ] Test role-based access control
- [ ] Test progress save/resume
- [ ] Test dashboard switching (user/author)
- [ ] Test publication creation
- [ ] Test co-author management

## 🚀 Quick Start Guide

### 1. Run Migration (Already Done ✅)
```bash
cd backend
node migrate.js
```

### 2. Start Backend
```bash
cd backend
npm run dev
```

### 3. Test API with Postman/cURL

**Check Eligibility:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/authors/check-eligibility
```

**Start Onboarding:**
```bash
curl -X POST http://localhost:5000/api/authors/onboarding/step1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testauthor",
    "display_name": "Test Author",
    "pen_name": "T. Author"
  }'
```

## 🎯 Key Product Decisions

### ✅ What We Got Right

1. **Opt-in, not forced** - Users aren't bombarded with author setup during signup
2. **Role-based, not identity-based** - One account, multiple capabilities
3. **Progressive disclosure** - Information requested step-by-step
4. **Save & resume** - Users can complete onboarding at their own pace
5. **Trigger-based activation** - Onboarding starts when user shows intent
6. **Future-proof** - Publications, co-authors, paid subscriptions ready

### 🚫 What We Avoided

1. **No forced "Are you a writer?" on signup** - Avoids overwhelming buyers
2. **No separate account types** - Simpler mental model
3. **No mandatory author profile for reading** - Readers stay anonymous
4. **No premature feature exposure** - Advanced features appear only when needed

## 📊 Database Changes Summary

### New Columns
```sql
-- users table
ALTER TABLE users ADD COLUMN roles text[] DEFAULT ARRAY['USER']::text[];

-- author_profiles table
ALTER TABLE author_profiles ADD COLUMN pen_name text;
ALTER TABLE author_profiles ADD COLUMN real_name text;
ALTER TABLE author_profiles ADD COLUMN writing_categories text[];
ALTER TABLE author_profiles ADD COLUMN writing_languages text[];
ALTER TABLE author_profiles ADD COLUMN social_links jsonb DEFAULT '{}'::jsonb;
ALTER TABLE author_profiles ADD COLUMN preferences jsonb DEFAULT '{}'::jsonb;
ALTER TABLE author_profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
ALTER TABLE author_profiles ADD COLUMN email_visible boolean DEFAULT false;
```

### New Tables
```sql
-- Publication co-authors
CREATE TABLE publication_co_authors (
  id SERIAL PRIMARY KEY,
  publication_id INTEGER REFERENCES publications(id),
  author_id INTEGER REFERENCES author_profiles(id),
  role TEXT CHECK (role IN ('owner', 'editor', 'contributor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(publication_id, author_id)
);
```

## 💡 Next Steps for You

### Immediate (Frontend Focus)

1. **Create the onboarding wizard** - Most critical for UX
2. **Add trigger buttons** - Show the onboarding entry points
3. **Test the full flow** - Make sure it feels natural

### Short-term (Polish)

4. **Build author dashboard** - Writers need their control center
5. **Add analytics** - Show writers their impact
6. **Style everything** - Make it beautiful like Substack

### Medium-term (Growth)

7. **Publication creation UI** - Enable newsletters
8. **Co-author invites** - Team writing
9. **Ecommerce integration** - Unique selling point
10. **Paid subscriptions** - Monetization

---

**Status**: Backend 100% Complete ✅  
**Next**: Frontend Implementation 🔨  
**Timeline**: 2-3 days for full frontend implementation

**Questions?** See `AUTHOR_USER_FLOW.md` for complete product specification.
