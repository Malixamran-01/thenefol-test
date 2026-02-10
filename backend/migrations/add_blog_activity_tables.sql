-- Blog Author Followers Table
CREATE TABLE IF NOT EXISTS blog_author_followers (
  id SERIAL PRIMARY KEY,
  author_id VARCHAR(255) NOT NULL,
  follower_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(author_id, follower_id)
);

CREATE INDEX IF NOT EXISTS idx_author_followers_author ON blog_author_followers(author_id);
CREATE INDEX IF NOT EXISTS idx_author_followers_follower ON blog_author_followers(follower_id);

-- Blog Author Subscribers Table
CREATE TABLE IF NOT EXISTS blog_author_subscribers (
  id SERIAL PRIMARY KEY,
  author_id VARCHAR(255) NOT NULL,
  subscriber_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(author_id, subscriber_id)
);

CREATE INDEX IF NOT EXISTS idx_author_subscribers_author ON blog_author_subscribers(author_id);
CREATE INDEX IF NOT EXISTS idx_author_subscribers_subscriber ON blog_author_subscribers(subscriber_id);

-- Blog Activities Table (general activity tracking)
CREATE TABLE IF NOT EXISTS blog_activities (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'post', 'like', 'comment', 'follow', etc.
  post_id VARCHAR(255),
  comment_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blog_activities_user ON blog_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_activities_type ON blog_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_blog_activities_date ON blog_activities(created_at DESC);

-- Add indexes to blog_post_likes for better feed query performance
CREATE INDEX IF NOT EXISTS idx_blog_post_likes_user ON blog_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_likes_created ON blog_post_likes(created_at DESC);

-- Add indexes to blog_comments for better feed query performance
CREATE INDEX IF NOT EXISTS idx_blog_comments_user ON blog_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_created ON blog_comments(created_at DESC);
