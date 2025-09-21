/*
  # Schema for Notfallmedizin content

  1. New Tables
    - `notfallmedizin_sections`
      - Main sections like Reanimation, cABCDE-Schema, etc.
      - Contains title, description, icon, color, route
    
    - `notfallmedizin_subsections`
      - Subsections for each main section
      - Contains title, description, content, route
    
    - `notfallmedizin_content`
      - Detailed content blocks for subsections
      - Supports text, images, tables, lists
      - Includes ordering and metadata
    
    - `notfallmedizin_references`
      - Academic citations and references
      - Links to specific content blocks

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users and admins
*/

-- Create notfallmedizin_sections table
CREATE TABLE IF NOT EXISTS notfallmedizin_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  route text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notfallmedizin_subsections table
CREATE TABLE IF NOT EXISTS notfallmedizin_subsections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES notfallmedizin_sections(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  content text NOT NULL,
  route text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notfallmedizin_content table
CREATE TABLE IF NOT EXISTS notfallmedizin_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subsection_id uuid REFERENCES notfallmedizin_subsections(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  "order" integer NOT NULL,
  title text,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notfallmedizin_references table
CREATE TABLE IF NOT EXISTS notfallmedizin_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES notfallmedizin_content(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  authors text,
  source text,
  url text,
  year integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE notfallmedizin_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notfallmedizin_subsections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notfallmedizin_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE notfallmedizin_references ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sections
CREATE POLICY "Authenticated users can read sections"
  ON notfallmedizin_sections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert sections"
  ON notfallmedizin_sections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update sections"
  ON notfallmedizin_sections
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create RLS policies for subsections
CREATE POLICY "Authenticated users can read subsections"
  ON notfallmedizin_subsections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert subsections"
  ON notfallmedizin_subsections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update subsections"
  ON notfallmedizin_subsections
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create RLS policies for content
CREATE POLICY "Authenticated users can read content"
  ON notfallmedizin_content
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert content"
  ON notfallmedizin_content
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update content"
  ON notfallmedizin_content
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create RLS policies for references
CREATE POLICY "Authenticated users can read references"
  ON notfallmedizin_references
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert references"
  ON notfallmedizin_references
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update references"
  ON notfallmedizin_references
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Add initial data for sections
INSERT INTO notfallmedizin_sections (title, description, icon, color, route) VALUES
('Reanimation', 'Grundlagen der kardiopulmonalen Reanimation', 'Heart', '#EF4444', '/practice/notfallmedizin/reanimation'),
('cABCDE-Schema', 'Systematische Notfallversorgung nach dem cABCDE-Schema', 'ClipboardCheck', '#0077B6', '/practice/notfallmedizin/cabcde-schema'),
('Schock', 'Schockformen und deren Management', 'Activity', '#F59E0B', '/practice/notfallmedizin/schock'),
('Trauma', 'Management von Traumapatienten', 'AlertTriangle', '#E2827F', '/practice/notfallmedizin/trauma'),
('Akute Erkrankungen', 'Management akuter internistischer Notfälle', 'Stethoscope', '#10B981', '/practice/notfallmedizin/akute-erkrankungen');

-- Add initial subsections for cABCDE-Schema
INSERT INTO notfallmedizin_subsections (section_id, title, description, content, route)
SELECT 
  sections.id,
  subsection.title,
  subsection.description,
  subsection.content,
  subsection.route
FROM notfallmedizin_sections sections
CROSS JOIN (
  VALUES 
    ('Grundlegende Prinzipien', 'Systematischer Ansatz in der Notfallversorgung', 'Detaillierte Beschreibung der grundlegenden Prinzipien...', '/practice/notfallmedizin/cabcde-schema/grundlegende-prinzipien'),
    ('Critical Bleeding', 'Management lebensbedrohlicher Blutungen', 'Detaillierte Beschreibung des Managements kritischer Blutungen...', '/practice/notfallmedizin/cabcde-schema/critical-bleeding'),
    ('Airway', 'Atemwegsmanagement und Sicherung der Atemwege', 'Detaillierte Beschreibung des Atemwegsmanagements...', '/practice/notfallmedizin/cabcde-schema/airway'),
    ('Breathing', 'Beurteilung und Management der Atmung', 'Detaillierte Beschreibung der Atmungsbeurteilung...', '/practice/notfallmedizin/cabcde-schema/breathing'),
    ('Circulation', 'Kreislaufmanagement und Volumentherapie', 'Detaillierte Beschreibung des Kreislaufmanagements...', '/practice/notfallmedizin/cabcde-schema/circulation'),
    ('Disability', 'Neurologische Beurteilung und Bewusstseinszustand', 'Detaillierte Beschreibung der neurologischen Beurteilung...', '/practice/notfallmedizin/cabcde-schema/disability'),
    ('Exposure', 'Ganzkörperuntersuchung und Umgebungsfaktoren', 'Detaillierte Beschreibung der Ganzkörperuntersuchung...', '/practice/notfallmedizin/cabcde-schema/exposure')
  ) as subsection(title, description, content, route)
WHERE sections.title = 'cABCDE-Schema';

-- Add example content for the first subsection
INSERT INTO notfallmedizin_content (subsection_id, type, "order", title, content, metadata)
SELECT 
  sub.id,
  'text',
  1,
  'Einführung in das cABCDE-Schema',
  'Das cABCDE-Schema ist ein systematischer Ansatz zur Beurteilung und Behandlung von Notfallpatienten...',
  '{"style": "introduction"}'::jsonb
FROM notfallmedizin_subsections sub
WHERE sub.title = 'Grundlegende Prinzipien';

-- Add example reference
INSERT INTO notfallmedizin_references (content_id, title, authors, source, year)
SELECT 
  content.id,
  'Strukturierte Notfallversorgung nach dem cABCDE-Schema',
  'Müller, Schmidt et al.',
  'Notfall + Rettungsmedizin',
  2024
FROM notfallmedizin_content content
WHERE content.title = 'Einführung in das cABCDE-Schema';