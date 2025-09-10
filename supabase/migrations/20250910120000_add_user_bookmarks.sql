-- User Bookmarks System Migration
-- Safe additive enhancement - no changes to existing tables

-- Create user_bookmarks table for saving favorite medical sections
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  section_slug text REFERENCES sections(slug) ON DELETE CASCADE NOT NULL,
  
  -- Metadata for better UX
  section_title text NOT NULL, -- Cached for faster display
  section_category text,       -- For grouping bookmarks
  bookmark_notes text,         -- User's personal notes on this section
  
  -- Tracking
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate bookmarks per user
  UNIQUE(user_id, section_slug)
);

-- Create bookmark_folders table for organizing bookmarks
CREATE TABLE IF NOT EXISTS bookmark_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Folder details
  name text NOT NULL,
  description text,
  color text DEFAULT '#4F46E5', -- Default blue color
  icon text DEFAULT 'Folder',   -- Lucide icon name
  
  -- Organization
  display_order integer DEFAULT 0,
  is_default boolean DEFAULT false,
  
  -- Tracking
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique folder names per user
  UNIQUE(user_id, name)
);

-- Junction table for bookmarks in folders (many-to-many)
CREATE TABLE IF NOT EXISTS bookmark_folder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bookmark_id uuid REFERENCES user_bookmarks(id) ON DELETE CASCADE NOT NULL,
  folder_id uuid REFERENCES bookmark_folders(id) ON DELETE CASCADE NOT NULL,
  
  -- Organization within folder
  display_order integer DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate bookmark in same folder
  UNIQUE(bookmark_id, folder_id)
);

-- Enable Row Level Security
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_folder_items ENABLE ROW LEVEL SECURITY;

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

-- RLS Policies for bookmark_folders
CREATE POLICY "Users can view their own folders"
  ON bookmark_folders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
  ON bookmark_folders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON bookmark_folders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON bookmark_folders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for bookmark_folder_items (via bookmark ownership)
CREATE POLICY "Users can view their own bookmark folder items"
  ON bookmark_folder_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_bookmarks 
      WHERE id = bookmark_folder_items.bookmark_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own bookmark folder items"
  ON bookmark_folder_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_bookmarks 
      WHERE id = bookmark_folder_items.bookmark_id 
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_bookmarks 
      WHERE id = bookmark_folder_items.bookmark_id 
      AND user_id = auth.uid()
    )
  );

-- Indexes for better performance
CREATE INDEX idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX idx_user_bookmarks_section_slug ON user_bookmarks(section_slug);
CREATE INDEX idx_user_bookmarks_created_at ON user_bookmarks(created_at DESC);

CREATE INDEX idx_bookmark_folders_user_id ON bookmark_folders(user_id);
CREATE INDEX idx_bookmark_folders_display_order ON bookmark_folders(user_id, display_order);

CREATE INDEX idx_bookmark_folder_items_bookmark_id ON bookmark_folder_items(bookmark_id);
CREATE INDEX idx_bookmark_folder_items_folder_id ON bookmark_folder_items(folder_id);

-- Function to automatically create default folder for new users
CREATE OR REPLACE FUNCTION create_default_bookmark_folder()
RETURNS trigger AS $$
BEGIN
  INSERT INTO bookmark_folders (user_id, name, description, is_default, color, icon)
  VALUES (
    NEW.id,
    'Meine Favoriten',
    'Standardordner für gespeicherte medizinische Inhalte',
    true,
    '#10B981', -- Green color for medical theme
    'Heart'    -- Medical heart icon
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default folder when user signs up
CREATE TRIGGER on_auth_user_created_create_bookmark_folder
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_bookmark_folder();

-- Function to update bookmark metadata when section changes
CREATE OR REPLACE FUNCTION update_bookmark_section_metadata()
RETURNS trigger AS $$
BEGIN
  -- Update cached section info in bookmarks when sections table changes
  UPDATE user_bookmarks 
  SET 
    section_title = NEW.title,
    section_category = NEW.category,
    updated_at = now()
  WHERE section_slug = NEW.slug;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to keep bookmark metadata in sync
CREATE TRIGGER on_sections_updated_sync_bookmarks
  AFTER UPDATE OF title, category ON sections
  FOR EACH ROW EXECUTE FUNCTION update_bookmark_section_metadata();

COMMIT;