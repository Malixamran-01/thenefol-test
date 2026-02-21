// Database Migration Script
require('dotenv/config');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol';

// Check if this is a Supabase connection (requires SSL)
const isSupabase = connectionString.includes('supabase.co');
const poolConfig = isSupabase 
  ? { 
      connectionString,
      ssl: { rejectUnauthorized: false } // Supabase requires SSL
    }
  : { connectionString };

const pool = new Pool(poolConfig);

async function runMigration() {
  console.log('🔄 Running database migration...');
  
  try {
    console.log('📝 Step 1: Creating base tables...');
    // Create base tables first (without foreign key dependencies)
    await pool.query(`
      -- Products table
      CREATE TABLE IF NOT EXISTS products (
        id serial primary key,
        title text not null,
        slug text unique,
        category text default '',
        price text default '',
        list_image text default '',
        description text default '',
        details jsonb default '{}'::jsonb,
        brand text default '',
        key_ingredients text default '',
        skin_type text default '',
        hair_type text default '',
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
      
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id serial primary key,
        name text not null,
        email text unique not null,
        password text not null,
        phone text,
        address jsonb,
        profile_photo text,
        roles text[] default ARRAY['USER']::text[], -- Role-based access: USER, AUTHOR, ADMIN
        loyalty_points integer default 0,
        total_orders integer default 0,
        member_since timestamptz default now(),
        is_verified boolean default false,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );

      -- Author Profiles (Creator Identity - separate from users, opt-in)
      CREATE TABLE IF NOT EXISTS author_profiles (
        id serial primary key,
        user_id integer unique not null references users(id) on delete cascade,
        unique_user_id text,
        email text,
        username text unique not null,
        display_name text not null,
        pen_name text,
        real_name text,
        bio text,
        profile_image text,
        cover_image text,
        website text,
        location text,
        writing_categories text[], -- Tech, Mental health, Diaries, Business, Poetry
        writing_languages text[], -- English, Spanish, etc
        social_links jsonb default '{}'::jsonb, -- Twitter, Instagram, LinkedIn, etc
        preferences jsonb default '{}'::jsonb, -- allow_comments, allow_subscriptions, show_products, etc
        is_verified boolean default false,
        email_visible boolean default false,
        onboarding_completed boolean default false,
        status text not null default 'active' check (status in ('active', 'inactive', 'banned', 'deleted')),
        deleted_at timestamptz,
        recovery_until timestamptz,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );

      -- Publications (Substack-like, optional but powerful)
      CREATE TABLE IF NOT EXISTS publications (
        id serial primary key,
        owner_author_id integer not null references author_profiles(id) on delete cascade,
        name text not null,
        slug text unique not null,
        description text,
        logo text,
        cover_image text,
        category text,
        subscription_model text default 'free' check (subscription_model in ('free', 'paid', 'mixed')),
        email_notifications boolean default true,
        allow_co_authors boolean default false,
        is_paid boolean default false,
        status text not null default 'active' check (status in ('active', 'inactive', 'deleted')),
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );

      -- Publication Co-Authors (for collaborative writing)
      CREATE TABLE IF NOT EXISTS publication_co_authors (
        id serial primary key,
        publication_id integer not null references publications(id) on delete cascade,
        author_id integer not null references author_profiles(id) on delete cascade,
        role text default 'contributor' check (role in ('owner', 'editor', 'contributor')),
        created_at timestamptz default now(),
        unique(publication_id, author_id)
      );
      
      -- Blog posts table (extended for author_profiles)
      CREATE TABLE IF NOT EXISTS blog_posts (
        id serial primary key,
        author_id integer,
        publication_id integer,
        user_id integer references users(id) on delete set null,
        title text not null,
        excerpt text not null,
        content text not null,
        author_name text not null,
        author_email text not null,
        cover_image text,
        detail_image text,
        images jsonb default '[]'::jsonb,
        status text not null default 'pending' check (status in ('draft', 'pending', 'approved', 'rejected', 'deleted')),
        featured boolean default false,
        rejection_reason text,
        meta_title text,
        meta_description text,
        meta_keywords jsonb,
        og_title text,
        og_description text,
        og_image text,
        canonical_url text,
        categories jsonb,
        allow_comments boolean default true,
        is_active boolean default true,
        is_archived boolean default false,
        is_deleted boolean default false,
        deleted_at timestamptz,
        views_count integer default 0,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );

      -- Ensure blog_posts extended columns exist (migration for existing tables)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN user_id integer references users(id) on delete set null;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'author_id'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN author_id integer references author_profiles(id) on delete set null;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'publication_id'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN publication_id integer references publications(id) on delete set null;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'views_count'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN views_count integer default 0;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'meta_title'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN meta_title text;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'meta_description'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN meta_description text;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'meta_keywords'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN meta_keywords jsonb;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'og_title'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN og_title text;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'og_description'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN og_description text;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'og_image'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN og_image text;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'canonical_url'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN canonical_url text;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'categories'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN categories jsonb;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'allow_comments'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN allow_comments boolean default true;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'is_active'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN is_active boolean default true;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'is_archived'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN is_archived boolean default false;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'is_deleted'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN is_deleted boolean default false;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'deleted_at'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN deleted_at timestamptz;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'cover_image'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN cover_image text;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'detail_image'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN detail_image text;
        END IF;
      END $$;

      -- Blog comments (threaded with Path Enumeration)
      CREATE TABLE IF NOT EXISTS blog_comments (
        id serial primary key,
        post_id integer not null references blog_posts(id) on delete cascade,
        parent_id integer references blog_comments(id) on delete cascade,
        ancestors integer[], -- Path Enumeration: array of ancestor comment IDs from root to parent
        user_id integer references users(id) on delete set null,
        author_name text,
        author_email text,
        content text not null,
        is_active boolean default true,
        is_archived boolean default false,
        is_deleted boolean default false,
        deleted_at timestamptz,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );

      -- Blog drafts (auto-save + manual drafts)
      CREATE TABLE IF NOT EXISTS blog_drafts (
        id serial primary key,
        user_id integer references users(id) on delete cascade,
        title text default '',
        content text default '',
        excerpt text default '',
        author_name text default '',
        author_email text default '',
        meta_title text,
        meta_description text,
        meta_keywords jsonb,
        og_title text,
        og_description text,
        og_image text,
        canonical_url text,
        categories jsonb default '[]'::jsonb,
        allow_comments boolean default true,
        cover_image text,
        detail_image text,
        images jsonb default '[]'::jsonb,
        status text not null default 'auto' check (status in ('auto', 'manual')),
        name text,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
      CREATE INDEX IF NOT EXISTS idx_blog_drafts_user_id ON blog_drafts(user_id);
      CREATE INDEX IF NOT EXISTS idx_blog_drafts_status ON blog_drafts(status);
      CREATE INDEX IF NOT EXISTS idx_blog_drafts_updated_at ON blog_drafts(updated_at);

      -- Blog drafts v2: production columns (content_hash, version, post_id, last_opened_at)
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_drafts' AND column_name = 'post_id') THEN
          ALTER TABLE blog_drafts ADD COLUMN post_id integer references blog_posts(id) on delete set null;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_drafts' AND column_name = 'content_hash') THEN
          ALTER TABLE blog_drafts ADD COLUMN content_hash text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_drafts' AND column_name = 'version') THEN
          ALTER TABLE blog_drafts ADD COLUMN version integer default 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_drafts' AND column_name = 'last_opened_at') THEN
          ALTER TABLE blog_drafts ADD COLUMN last_opened_at timestamptz;
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS idx_blog_drafts_post_id ON blog_drafts(post_id);

      -- Blog drafts v3: session_id for session-bound auto drafts (fixes "old draft restored on new blog")
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_drafts' AND column_name = 'session_id') THEN
          ALTER TABLE blog_drafts ADD COLUMN session_id text;
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS idx_blog_drafts_session_id ON blog_drafts(session_id) WHERE session_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_blog_drafts_user_session ON blog_drafts(user_id, session_id) WHERE status = 'auto' AND session_id IS NOT NULL;

      -- Blog draft versions (immutable snapshots; draft = mutable, version = snapshot)
      CREATE TABLE IF NOT EXISTS blog_draft_versions (
        id serial primary key,
        user_id integer references users(id) on delete cascade,
        post_id integer references blog_posts(id) on delete set null,
        version integer not null default 1,
        title text default '',
        content text default '',
        excerpt text default '',
        author_name text default '',
        author_email text default '',
        meta_title text,
        meta_description text,
        meta_keywords jsonb,
        og_title text,
        og_description text,
        og_image text,
        canonical_url text,
        categories jsonb default '[]'::jsonb,
        allow_comments boolean default true,
        created_at timestamptz default now()
      );
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_draft_versions' AND column_name = 'draft_id') THEN
          ALTER TABLE blog_draft_versions ADD COLUMN draft_id integer references blog_drafts(id) on delete set null;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_draft_versions' AND column_name = 'snapshot_reason') THEN
          ALTER TABLE blog_draft_versions ADD COLUMN snapshot_reason text not null default 'AUTO_INTERVAL';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_draft_versions' AND column_name = 'version_number') THEN
          ALTER TABLE blog_draft_versions ADD COLUMN version_number integer;
          UPDATE blog_draft_versions SET version_number = version WHERE version_number IS NULL;
          UPDATE blog_draft_versions SET version_number = 1 WHERE version_number IS NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_draft_versions' AND column_name = 'og_image') THEN
          ALTER TABLE blog_draft_versions ADD COLUMN og_image text;
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS idx_draft_versions_draft_id ON blog_draft_versions(draft_id) WHERE draft_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_draft_versions_user ON blog_draft_versions(user_id);
      CREATE INDEX IF NOT EXISTS idx_draft_versions_created ON blog_draft_versions(created_at DESC);

      -- Blog comment likes
      CREATE TABLE IF NOT EXISTS blog_comment_likes (
        id serial primary key,
        comment_id integer not null references blog_comments(id) on delete cascade,
        user_id integer references users(id) on delete set null,
        created_at timestamptz default now(),
        unique(comment_id, user_id)
      );

      -- Blog likes
      CREATE TABLE IF NOT EXISTS blog_post_likes (
        id serial primary key,
        post_id integer not null references blog_posts(id) on delete cascade,
        user_id integer references users(id) on delete set null,
        created_at timestamptz default now(),
        unique(post_id, user_id)
      );

      -- Author Followers (Social graph - lightweight)
      CREATE TABLE IF NOT EXISTS author_followers (
        id serial primary key,
        author_id integer not null references author_profiles(id) on delete cascade,
        follower_user_id integer not null references users(id) on delete cascade,
        created_at timestamptz default now(),
        unique(author_id, follower_user_id)
      );

      -- Author Subscriptions (Email + money + trust - heavyweight)
      CREATE TABLE IF NOT EXISTS author_subscriptions (
        id serial primary key,
        author_id integer not null references author_profiles(id) on delete cascade,
        user_id integer references users(id) on delete set null,
        email text not null,
        type text not null default 'free' check (type in ('free', 'paid')),
        status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
        subscribed_at timestamptz default now(),
        cancelled_at timestamptz,
        created_at timestamptz default now(),
        updated_at timestamptz default now(),
        constraint author_subscriptions_author_id_user_id_key unique(author_id, user_id)
      );

      -- Author Stats (Cached counters for performance)
      CREATE TABLE IF NOT EXISTS author_stats (
        author_id integer primary key references author_profiles(id) on delete cascade,
        followers_count integer default 0,
        subscribers_count integer default 0,
        posts_count integer default 0,
        total_views integer default 0,
        total_likes integer default 0,
        updated_at timestamptz default now()
      );

      -- Blog Activities (Feed algorithm tracking)
      CREATE TABLE IF NOT EXISTS blog_activities (
        id serial primary key,
        user_id integer references users(id) on delete set null,
        author_id integer references author_profiles(id) on delete set null,
        activity_type text not null,
        post_id integer,
        comment_id integer,
        metadata jsonb,
        created_at timestamptz default now()
      );
      
      -- CMS pages table
      CREATE TABLE IF NOT EXISTS cms_pages (
        id serial primary key,
        slug text unique not null,
        title text not null,
        content jsonb default '{}'::jsonb,
        meta_description text,
        is_active boolean default true,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
      
      -- CMS sections table
      CREATE TABLE IF NOT EXISTS cms_sections (
        id serial primary key,
        page_id integer not null references cms_pages(id) on delete cascade,
        section_type text not null,
        title text,
        content jsonb default '{}'::jsonb,
        order_index integer default 0,
        is_active boolean default true,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
      
      -- Orders table
      CREATE TABLE IF NOT EXISTS orders (
        id serial primary key,
        order_number text unique not null,
        customer_name text not null,
        customer_email text not null,
        shipping_address jsonb not null,
        items jsonb not null,
        subtotal numeric(12,2) not null,
        shipping numeric(12,2) not null default 0,
        tax numeric(12,2) not null default 0,
        total numeric(12,2) not null,
        status text not null default 'created',
        payment_method text,
        payment_type text,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
      
      -- Cart table
      CREATE TABLE IF NOT EXISTS cart (
        id serial primary key,
        user_id integer not null references users(id) on delete cascade,
        product_id integer not null references products(id) on delete cascade,
        quantity integer not null default 1,
        created_at timestamptz default now(),
        updated_at timestamptz default now(),
        unique(user_id, product_id)
      );
      
      -- Wishlist table
      CREATE TABLE IF NOT EXISTS wishlist (
        id serial primary key,
        user_id integer not null references users(id) on delete cascade,
        product_id integer not null references products(id) on delete cascade,
        created_at timestamptz default now(),
        unique(user_id, product_id)
      );
    `);

    console.log('📝 Step 2: Adding missing columns and foreign keys...');
    // Add columns to existing tables and foreign key constraints
    await pool.query(`
      DO $$ 
      BEGIN
        -- Add roles to users if it doesn't exist (role-based access control)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'roles'
        ) THEN
          ALTER TABLE users ADD COLUMN roles text[] default ARRAY['USER']::text[];
        END IF;

        -- Add author_id to blog_posts if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'author_id'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN author_id integer;
        END IF;

        -- Add publication_id to blog_posts if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'publication_id'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN publication_id integer;
        END IF;

        -- Add views_count to blog_posts if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'views_count'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN views_count integer default 0;
        END IF;

        -- Add foreign key constraints if they don't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'blog_posts_author_id_fkey'
        ) THEN
          ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_author_id_fkey 
            FOREIGN KEY (author_id) REFERENCES author_profiles(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'blog_posts_publication_id_fkey'
        ) THEN
          ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_publication_id_fkey 
            FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE SET NULL;
        END IF;

        -- Add email and unique_user_id to author_profiles for profile identification
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'author_profiles' AND column_name = 'email'
        ) THEN
          ALTER TABLE author_profiles ADD COLUMN email text;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'author_profiles' AND column_name = 'unique_user_id'
        ) THEN
          ALTER TABLE author_profiles ADD COLUMN unique_user_id text;
        END IF;

        -- Backfill email and unique_user_id for existing author profiles from users table
        UPDATE author_profiles ap SET
          email = u.email,
          unique_user_id = u.unique_user_id
        FROM users u
        WHERE ap.user_id = u.id AND (ap.email IS NULL OR ap.unique_user_id IS NULL);
      END $$;
    `);
    
    console.log('📝 Step 3: Creating indexes...');
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_author_profiles_user_id ON author_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_author_profiles_username ON author_profiles(username);
      CREATE INDEX IF NOT EXISTS idx_author_profiles_status ON author_profiles(status);
      CREATE INDEX IF NOT EXISTS idx_author_profiles_unique_user_id ON author_profiles(unique_user_id) WHERE unique_user_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_publications_slug ON publications(slug);
      CREATE INDEX IF NOT EXISTS idx_publications_owner ON publications(owner_author_id);
      CREATE INDEX IF NOT EXISTS idx_author_followers_author ON author_followers(author_id);
      CREATE INDEX IF NOT EXISTS idx_author_followers_follower ON author_followers(follower_user_id);
      CREATE INDEX IF NOT EXISTS idx_author_subscriptions_author ON author_subscriptions(author_id);
      CREATE INDEX IF NOT EXISTS idx_author_subscriptions_user ON author_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_author_subscriptions_email ON author_subscriptions(email);
      CREATE INDEX IF NOT EXISTS idx_author_subscriptions_status ON author_subscriptions(status);
      -- Indexes for new columns will be created in Step 4
      CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(featured);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_active ON blog_posts(is_active);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_archived ON blog_posts(is_archived);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_deleted ON blog_posts(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_user_id ON blog_posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_categories ON blog_posts USING gin ((categories));
      CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id ON blog_comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_blog_comments_parent_id ON blog_comments(parent_id);
      CREATE INDEX IF NOT EXISTS idx_blog_comments_deleted ON blog_comments(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_blog_comments_ancestors ON blog_comments USING gin(ancestors); -- GIN index for efficient array queries
      CREATE INDEX IF NOT EXISTS idx_blog_comment_likes_comment_id ON blog_comment_likes(comment_id);
      CREATE INDEX IF NOT EXISTS idx_blog_comment_likes_user_id ON blog_comment_likes(user_id);
      CREATE INDEX IF NOT EXISTS idx_blog_likes_post_id ON blog_post_likes(post_id);
      CREATE INDEX IF NOT EXISTS idx_blog_likes_user_id ON blog_post_likes(user_id);
      CREATE INDEX IF NOT EXISTS idx_blog_post_likes_created ON blog_post_likes(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_blog_activities_user ON blog_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_blog_activities_type ON blog_activities(activity_type);
      CREATE INDEX IF NOT EXISTS idx_blog_activities_date ON blog_activities(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_blog_comments_user ON blog_comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_blog_comments_created ON blog_comments(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug);
      CREATE INDEX IF NOT EXISTS idx_cms_sections_page_id ON cms_sections(page_id);
      CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
    `);

    console.log('📝 Step 4: Creating indexes for new columns...');
    // Create indexes for newly added columns (conditional)
    await pool.query(`
      DO $$
      BEGIN
        -- Create index on author_id if column exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'author_id'
        ) THEN
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id)';
        END IF;

        -- Create index on publication_id if column exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'publication_id'
        ) THEN
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_blog_posts_publication_id ON blog_posts(publication_id)';
        END IF;

        -- Create index on author_id in blog_activities if column exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_activities' AND column_name = 'author_id'
        ) THEN
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_blog_activities_author ON blog_activities(author_id)';
        END IF;
      END $$;
    `);
    
    console.log('📝 Step 5: Creating trigger functions...');
    // Create trigger functions
    await pool.query(`
      -- Updated_at trigger
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS trigger AS $$ 
      BEGIN 
        new.updated_at = now(); 
        return new; 
      END; 
      $$ language plpgsql SET search_path = public;

      -- Update author stats on follower change
      CREATE OR REPLACE FUNCTION update_author_followers_count()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          INSERT INTO author_stats (author_id, followers_count)
          VALUES (NEW.author_id, 1)
          ON CONFLICT (author_id)
          DO UPDATE SET followers_count = author_stats.followers_count + 1, updated_at = now();
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE author_stats 
          SET followers_count = GREATEST(0, followers_count - 1), updated_at = now()
          WHERE author_id = OLD.author_id;
        END IF;
        RETURN NULL;
      END;
      $$ language plpgsql SET search_path = public;

      -- Update author stats on subscriber change
      CREATE OR REPLACE FUNCTION update_author_subscribers_count()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          INSERT INTO author_stats (author_id, subscribers_count)
          VALUES (NEW.author_id, 1)
          ON CONFLICT (author_id)
          DO UPDATE SET subscribers_count = author_stats.subscribers_count + 1, updated_at = now();
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE author_stats 
          SET subscribers_count = GREATEST(0, subscribers_count - 1), updated_at = now()
          WHERE author_id = OLD.author_id;
        END IF;
        RETURN NULL;
      END;
      $$ language plpgsql SET search_path = public;

      -- Update author stats on post change
      CREATE OR REPLACE FUNCTION update_author_posts_count()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'INSERT' AND NEW.author_id IS NOT NULL THEN
          INSERT INTO author_stats (author_id, posts_count)
          VALUES (NEW.author_id, 1)
          ON CONFLICT (author_id)
          DO UPDATE SET posts_count = author_stats.posts_count + 1, updated_at = now();
        ELSIF TG_OP = 'DELETE' AND OLD.author_id IS NOT NULL THEN
          UPDATE author_stats 
          SET posts_count = GREATEST(0, posts_count - 1), updated_at = now()
          WHERE author_id = OLD.author_id;
        END IF;
        RETURN NULL;
      END;
      $$ language plpgsql SET search_path = public;
    `);

    console.log('📝 Step 6: Creating triggers...');
    // Add triggers
    await pool.query(`
      -- Updated_at triggers
      DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
      CREATE TRIGGER trg_products_updated_at 
        BEFORE UPDATE ON products
        FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
        
      DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
      CREATE TRIGGER trg_users_updated_at 
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
        
      DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON blog_posts;
      CREATE TRIGGER trg_blog_posts_updated_at 
        BEFORE UPDATE ON blog_posts
        FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

      DROP TRIGGER IF EXISTS trg_author_profiles_updated_at ON author_profiles;
      CREATE TRIGGER trg_author_profiles_updated_at 
        BEFORE UPDATE ON author_profiles
        FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

      DROP TRIGGER IF EXISTS trg_publications_updated_at ON publications;
      CREATE TRIGGER trg_publications_updated_at 
        BEFORE UPDATE ON publications
        FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

      DROP TRIGGER IF EXISTS trg_author_subscriptions_updated_at ON author_subscriptions;
      CREATE TRIGGER trg_author_subscriptions_updated_at 
        BEFORE UPDATE ON author_subscriptions
        FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
        
      DROP TRIGGER IF EXISTS trg_cms_pages_updated_at ON cms_pages;
      CREATE TRIGGER trg_cms_pages_updated_at 
        BEFORE UPDATE ON cms_pages
        FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
        
      DROP TRIGGER IF EXISTS trg_cms_sections_updated_at ON cms_sections;
      CREATE TRIGGER trg_cms_sections_updated_at 
        BEFORE UPDATE ON cms_sections
        FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
        
      DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
      CREATE TRIGGER trg_orders_updated_at 
        BEFORE UPDATE ON orders
        FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
        
      DROP TRIGGER IF EXISTS trg_cart_updated_at ON cart;
      CREATE TRIGGER trg_cart_updated_at 
        BEFORE UPDATE ON cart
        FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

      -- Author stats triggers
      DROP TRIGGER IF EXISTS trg_author_followers_stats ON author_followers;
      CREATE TRIGGER trg_author_followers_stats
        AFTER INSERT OR DELETE ON author_followers
        FOR EACH ROW EXECUTE PROCEDURE update_author_followers_count();

      DROP TRIGGER IF EXISTS trg_author_subscriptions_stats ON author_subscriptions;
      CREATE TRIGGER trg_author_subscriptions_stats
        AFTER INSERT OR DELETE ON author_subscriptions
        FOR EACH ROW EXECUTE PROCEDURE update_author_subscribers_count();

      DROP TRIGGER IF EXISTS trg_blog_posts_stats ON blog_posts;
      CREATE TRIGGER trg_blog_posts_stats
        AFTER INSERT OR DELETE ON blog_posts
        FOR EACH ROW EXECUTE PROCEDURE update_author_posts_count();
    `);
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
