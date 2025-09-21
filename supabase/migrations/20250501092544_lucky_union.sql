/*
  # Create Innere Medizin content tables

  1. New Tables
    - `innere_medizin_sections`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `icon` (text)
      - `color` (text)
      - `route` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `innere_medizin_subsections`
      - `id` (uuid, primary key)
      - `section_id` (uuid, foreign key → innere_medizin_sections.id)
      - `title` (text)
      - `description` (text)
      - `content` (text)
      - `route` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create innere_medizin_sections table
CREATE TABLE IF NOT EXISTS innere_medizin_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  route text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create innere_medizin_subsections table
CREATE TABLE IF NOT EXISTS innere_medizin_subsections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES innere_medizin_sections(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  content text NOT NULL,
  route text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE innere_medizin_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE innere_medizin_subsections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for innere_medizin_sections
CREATE POLICY "Authenticated users can read sections"
  ON innere_medizin_sections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert sections"
  ON innere_medizin_sections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update sections"
  ON innere_medizin_sections
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create RLS policies for innere_medizin_subsections
CREATE POLICY "Authenticated users can read subsections"
  ON innere_medizin_subsections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert subsections"
  ON innere_medizin_subsections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update subsections"
  ON innere_medizin_subsections
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Add some initial data for sections
INSERT INTO innere_medizin_sections (title, description, icon, color, route) VALUES
('Kardiologie', 'Systematische Übersicht der kardiologischen Erkrankungen', 'Heart', '#0077B6', '/practice/cardiology'),
('Gastroenterologie', 'Erkrankungen des Verdauungssystems', 'Activity', '#48CAE4', '/practice/gastroenterologie'),
('Pneumologie', 'Erkrankungen der Atemwege und Lunge', 'Lungs', '#22C55E', '/practice/pneumologie'),
('Nephrologie', 'Erkrankungen der Nieren', 'Kidney', '#E2827F', '/practice/nephrologie'),
('Endokrinologie', 'Hormonelle und Stoffwechselerkrankungen', 'Flask', '#EF4444', '/practice/endokrinologie-stoffwechsel');

-- Add some initial data for subsections (example for Kardiologie)
INSERT INTO innere_medizin_subsections (section_id, title, description, content, route) 
SELECT 
  sections.id,
  'Grundlagen',
  'Anatomie, Physiologie und Pathophysiologie des Herzens',
  'Detaillierte Beschreibung der kardiologischen Grundlagen...',
  '/practice/cardiology/basics'
FROM innere_medizin_sections sections
WHERE sections.title = 'Kardiologie';