-- Table for tracking user progress through lesson sections
-- Each row represents a completed section within a lesson

CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_slug TEXT NOT NULL,
  section_index INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure each user can only mark a section complete once
  CONSTRAINT unique_user_lesson_section UNIQUE(user_id, lesson_slug, section_index)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user_lesson
  ON user_lesson_progress(user_id, lesson_slug);

CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user
  ON user_lesson_progress(user_id);

-- Enable Row Level Security
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own progress
CREATE POLICY "Users can view their own progress"
  ON user_lesson_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own progress
CREATE POLICY "Users can insert their own progress"
  ON user_lesson_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own progress
CREATE POLICY "Users can update their own progress"
  ON user_lesson_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own progress
CREATE POLICY "Users can delete their own progress"
  ON user_lesson_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_lesson_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_lesson_progress_updated_at
  BEFORE UPDATE ON user_lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_lesson_progress_updated_at();

-- Comment on table
COMMENT ON TABLE user_lesson_progress IS 'Tracks which sections within each lesson a user has completed';
COMMENT ON COLUMN user_lesson_progress.lesson_slug IS 'The slug of the lesson (matches sections.slug)';
COMMENT ON COLUMN user_lesson_progress.section_index IS 'The index of the completed section within the lesson content (0-based)';
