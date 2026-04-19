-- Create recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  cook_time TEXT,
  servings TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_url UNIQUE(user_id, url)
);

-- Create recipe_tags table
CREATE TABLE recipe_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_recipe_tag UNIQUE(recipe_id, tag)
);

-- Migration: add notes field
-- ALTER TABLE recipes ADD COLUMN notes TEXT;

-- Create indexes for better query performance
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipe_tags_recipe_id ON recipe_tags(recipe_id);
CREATE INDEX idx_recipe_tags_tag ON recipe_tags(tag);

-- Enable Row Level Security
-- All server-side API access uses the service role key, which bypasses RLS.
-- RLS blocks direct anon key access to the database (e.g. from the browser or
-- anyone who obtains the public anon key).
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;

-- No permissive policies are defined for the anon/public role.
-- With RLS enabled and no matching policies, all anon key requests are denied.
-- Authentication and authorization are enforced in the server-side API routes
-- via Clerk before any Supabase query runs.

-- Create user_profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create follows table
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id TEXT NOT NULL,   -- Clerk user_id of the follower
  following_id TEXT NOT NULL,  -- Clerk user_id of the person being followed
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_follow UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_clerk_user_id ON user_profiles(clerk_user_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
