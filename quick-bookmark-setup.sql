-- Quick Bookmark Setup - Essential Tables Only
-- Copy and paste this into Supabase SQL Editor

-- Create user_bookmarks table
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  section_slug text NOT NULL,
  section_title text NOT NULL,
  section_category text,
  bookmark_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, section_slug)
);

-- Enable Row Level Security
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON user_bookmarks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON user_bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
  ON user_bookmarks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON user_bookmarks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_section_slug ON user_bookmarks(section_slug);

-- Success message
SELECT 'Bookmark tables created successfully!' as status;