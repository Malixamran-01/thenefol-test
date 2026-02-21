-- Add missing og_image column to blog_draft_versions
ALTER TABLE blog_draft_versions ADD COLUMN IF NOT EXISTS og_image text;
