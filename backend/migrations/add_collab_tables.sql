-- Collab applications (similar to affiliate but for Instagram collab flow)
CREATE TABLE IF NOT EXISTS collab_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  instagram VARCHAR(255),
  youtube VARCHAR(255),
  facebook VARCHAR(255),
  followers VARCHAR(100),
  message TEXT,
  agree_terms BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collab reels - submitted reel links with views/likes for progress
CREATE TABLE IF NOT EXISTS collab_reels (
  id SERIAL PRIMARY KEY,
  collab_application_id INTEGER NOT NULL REFERENCES collab_applications(id) ON DELETE CASCADE,
  reel_url TEXT NOT NULL,
  instagram_username VARCHAR(255),
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(collab_application_id, reel_url)
);

CREATE INDEX IF NOT EXISTS idx_collab_applications_email ON collab_applications(email);
CREATE INDEX IF NOT EXISTS idx_collab_applications_user_id ON collab_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_reels_application ON collab_reels(collab_application_id);

-- Add columns if table already exists from older migration
ALTER TABLE collab_applications ADD COLUMN IF NOT EXISTS youtube VARCHAR(255);
ALTER TABLE collab_applications ADD COLUMN IF NOT EXISTS facebook VARCHAR(255);
ALTER TABLE collab_applications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE collab_applications ADD COLUMN IF NOT EXISTS agree_terms BOOLEAN DEFAULT FALSE;
ALTER TABLE collab_applications ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
