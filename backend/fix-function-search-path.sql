-- Fix "Function Search Path Mutable" security warnings
-- Run this against your database to update existing functions
-- Safe to run: uses CREATE OR REPLACE, no data changes

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$ 
BEGIN 
  new.updated_at = now(); 
  return new; 
END; 
$$ language plpgsql SET search_path = public;

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
