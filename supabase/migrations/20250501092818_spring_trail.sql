/*
  # Content tables for Innere Medizin sections

  1. New Tables
    - `innere_medizin_content`
      - `id` (uuid, primary key)
      - `subsection_id` (uuid, foreign key → innere_medizin_subsections.id)
      - `type` (text) - e.g., 'text', 'image', 'table', 'list'
      - `order` (integer) - for ordering content blocks
      - `title` (text)
      - `content` (text)
      - `metadata` (jsonb) - for additional type-specific data
      - timestamps

    - `innere_medizin_references`
      - `id` (uuid, primary key)
      - `content_id` (uuid, foreign key → innere_medizin_content.id)
      - `title` (text)
      - `authors` (text)
      - `source` (text)
      - `url` (text)
      - `year` (integer)
      - timestamps

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read
    - Add policies for admins to modify
*/

-- Create content table
CREATE TABLE IF NOT EXISTS innere_medizin_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subsection_id uuid REFERENCES innere_medizin_subsections(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  "order" integer NOT NULL,
  title text,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create references table
CREATE TABLE IF NOT EXISTS innere_medizin_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES innere_medizin_content(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  authors text,
  source text,
  url text,
  year integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE innere_medizin_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE innere_medizin_references ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for content
CREATE POLICY "Authenticated users can read content"
  ON innere_medizin_content
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert content"
  ON innere_medizin_content
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update content"
  ON innere_medizin_content
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create RLS policies for references
CREATE POLICY "Authenticated users can read references"
  ON innere_medizin_references
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert references"
  ON innere_medizin_references
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update references"
  ON innere_medizin_references
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Add example content for the Kardiologie basics subsection
INSERT INTO innere_medizin_content (subsection_id, type, "order", title, content, metadata)
SELECT 
  sub.id,
  'text',
  1,
  'Anatomie des Herzens',
  'Das Herz ist ein muskuläres Hohlorgan, das als zentrale Pumpe des Kreislaufsystems fungiert...',
  '{"style": "introduction"}'::jsonb
FROM innere_medizin_subsections sub
WHERE sub.title = 'Grundlagen';

-- Add example reference
INSERT INTO innere_medizin_references (content_id, title, authors, source, year)
SELECT 
  content.id,
  'Anatomie des Herzens: Eine systematische Übersicht',
  'Schmidt, Weber et al.',
  'Deutsches Ärzteblatt',
  2024
FROM innere_medizin_content content
WHERE content.title = 'Anatomie des Herzens';