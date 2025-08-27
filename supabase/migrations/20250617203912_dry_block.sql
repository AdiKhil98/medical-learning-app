/*
  # Create and configure sections table

  1. Table Structure
    - Create sections table if it doesn't exist
    - Define all necessary columns
    - Include extra columns for enhanced content management

  2. Security
    - Enable Row Level Security (RLS)
    - Create policies for authenticated users to read
    - Create policies for admin users to write/update
*/

-- Create sections table if it doesn't exist
CREATE TABLE IF NOT EXISTS sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  parent_slug text REFERENCES sections(slug) ON DELETE SET NULL,
  description text,
  type text NOT NULL DEFAULT 'folder',
  icon text,
  color text,
  display_order integer NOT NULL DEFAULT 0,
  image_url text,
  category text,
  content_details text,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY IF NOT EXISTS "Authenticated users can read sections"
  ON sections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Admin users can insert sections"
  ON sections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS "Admin users can update sections"
  ON sections
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS "Admin users can delete sections"
  ON sections
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create index for faster parent/child lookups
CREATE INDEX IF NOT EXISTS idx_sections_parent_slug ON sections(parent_slug);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_sections_display_order ON sections(display_order);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_sections_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS set_sections_last_updated
BEFORE UPDATE ON sections
FOR EACH ROW
EXECUTE FUNCTION update_sections_modified_column();