/*
  # Create sections table for medical content

  1. New Table
    - `sections`
      - `id` (uuid, primary key)
      - `slug` (text, unique)
      - `title` (text)
      - `parent_slug` (text, nullable)
      - `description` (text, nullable)
      - `type` (text) - e.g., 'folder', 'file-text', 'markdown'
      - `icon` (text)
      - `color` (text)
      - `display_order` (integer)
      - timestamps

  2. Security
    - Enable RLS on the table
    - Add policies for authenticated users to read
    - Add policies for admins to modify
*/

-- Create sections table
CREATE TABLE IF NOT EXISTS sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  parent_slug text,
  description text,
  type text NOT NULL,
  icon text,
  color text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can read sections"
  ON sections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert sections"
  ON sections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update sections"
  ON sections
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Add initial data for main sections
INSERT INTO sections (slug, title, parent_slug, description, type, icon, color, display_order) VALUES
('innere-medizin', 'Innere Medizin', NULL, 'Systematische Übersicht der internistischen Erkrankungen', 'folder', 'Stethoscope', '#0077B6', 1),
('chirurgie', 'Chirurgie', NULL, 'Systematische Übersicht der chirurgischen Fachgebiete', 'folder', 'Scissors', '#48CAE4', 2),
('notfallmedizin', 'Notfallmedizin', NULL, 'Systematische Übersicht der notfallmedizinischen Versorgung', 'folder', 'AlertTriangle', '#EF4444', 3),
('paediatrie', 'Pädiatrie', NULL, 'Systematische Übersicht der pädiatrischen Erkrankungen', 'folder', 'Baby', '#8B5CF6', 4),
('gynaekologie', 'Gynäkologie', NULL, 'Systematische Übersicht der gynäkologischen Erkrankungen', 'folder', 'Activity', '#EC4899', 5),
('psychiatrie', 'Psychiatrie', NULL, 'Systematische Übersicht der psychiatrischen Erkrankungen', 'folder', 'Brain', '#F59E0B', 6);

-- Add subsections for Innere Medizin
INSERT INTO sections (slug, title, parent_slug, description, type, icon, color, display_order) VALUES
('kardiologie', 'Kardiologie', 'innere-medizin', 'Erkrankungen des Herzens und der Gefäße', 'folder', 'Heart', '#0077B6', 1),
('gastroenterologie', 'Gastroenterologie', 'innere-medizin', 'Erkrankungen des Verdauungssystems', 'folder', 'Activity', '#48CAE4', 2),
('pneumologie', 'Pneumologie', 'innere-medizin', 'Erkrankungen der Atemwege und Lunge', 'folder', 'Lungs', '#22C55E', 3),
('nephrologie', 'Nephrologie', 'innere-medizin', 'Erkrankungen der Nieren', 'folder', 'Activity', '#8B5CF6', 4),
('endokrinologie-stoffwechsel', 'Endokrinologie und Stoffwechsel', 'innere-medizin', 'Hormonelle und Stoffwechselerkrankungen', 'folder', 'FlaskRound', '#EF4444', 5);

-- Add subsections for Kardiologie
INSERT INTO sections (slug, title, parent_slug, description, type, icon, color, display_order) VALUES
('kardiologie-grundlagen', 'Grundlagen', 'kardiologie', 'Anatomie, Physiologie und Pathophysiologie des Herzens', 'folder', 'Heart', '#0077B6', 1),
('kardiologie-leitsymptome', 'Leitsymptome', 'kardiologie', 'Brustschmerz, Dyspnoe, Synkope, Ödeme', 'folder', 'Stethoscope', '#48CAE4', 2),
('kardiologie-diagnostik', 'Diagnostik', 'kardiologie', 'EKG, Bildgebung, Labordiagnostik', 'folder', 'Activity', '#22C55E', 3),
('kardiologie-therapie', 'Therapie', 'kardiologie', 'Medikamentöse und interventionelle Therapien', 'folder', 'Pill', '#8B5CF6', 4),
('kardiologie-hypertonie', 'Hypertonie', 'kardiologie', 'Primäre und sekundäre Hypertonie', 'folder', 'ArrowUpRight', '#EF4444', 5),
('kardiologie-arrhythmie', 'Herzrhythmusstörungen', 'kardiologie', 'Bradykardie, Tachykardie, Vorhofflimmern', 'folder', 'HeartPulse', '#F59E0B', 6),
('kardiologie-ischemia', 'Ischämische Herzerkrankungen', 'kardiologie', 'KHK, Myokardinfarkt, Angina pectoris', 'folder', 'HeartCrack', '#EC4899', 7),
('kardiologie-cardiomyopathy', 'Kardiomyopathien', 'kardiologie', 'DCM, HCM, RCM, ARVC', 'folder', 'Heart', '#6366F1', 8);

-- Add subsections for Chirurgie
INSERT INTO sections (slug, title, parent_slug, description, type, icon, color, display_order) VALUES
('allgemein-viszeralchirurgie', 'Allgemein- und Viszeralchirurgie', 'chirurgie', 'Eingriffe am Verdauungstrakt und Bauchraum', 'folder', 'Scissors', '#48CAE4', 1),
('unfallchirurgie-orthopaedie', 'Unfallchirurgie und Orthopädie', 'chirurgie', 'Frakturen, Gelenkersatz, Wirbelsäule', 'folder', 'Activity', '#22C55E', 2),
('thoraxchirurgie', 'Thoraxchirurgie', 'chirurgie', 'Eingriffe an Lunge und Thorax', 'folder', 'Lungs', '#8B5CF6', 3),
('herzchirurgie', 'Herzchirurgie', 'chirurgie', 'Bypass, Klappen, Transplantation', 'folder', 'Heart', '#EF4444', 4),
('gefaesschirurgie', 'Gefäßchirurgie', 'chirurgie', 'Arterien, Venen, Aneurysmen', 'folder', 'Activity', '#F59E0B', 5),
('mkg-chirurgie', 'MKG-Chirurgie', 'chirurgie', 'Mund-, Kiefer- und Gesichtschirurgie', 'folder', 'Scissors', '#EC4899', 6);

-- Add subsections for Notfallmedizin
INSERT INTO sections (slug, title, parent_slug, description, type, icon, color, display_order) VALUES
('reanimation', 'Reanimation', 'notfallmedizin', 'Basic Life Support, Advanced Life Support', 'folder', 'Heart', '#EF4444', 1),
('cabcde-schema', 'cABCDE-Schema', 'notfallmedizin', 'Strukturiertes Vorgehen in der Notfallversorgung', 'folder', 'ClipboardCheck', '#0077B6', 2),
('schock', 'Schock', 'notfallmedizin', 'Hypovolämischer, kardiogener, septischer Schock', 'folder', 'Activity', '#F59E0B', 3),
('trauma', 'Trauma', 'notfallmedizin', 'Polytrauma, Schädel-Hirn-Trauma, Thoraxtrauma', 'folder', 'AlertTriangle', '#8B5CF6', 4),
('akute-erkrankungen', 'Akute Erkrankungen', 'notfallmedizin', 'Akutes Koronarsyndrom, Lungenembolie, Schlaganfall', 'folder', 'Stethoscope', '#10B981', 5);

-- Add login activity tracking table
CREATE TABLE IF NOT EXISTS login_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  logged_at date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, logged_at)
);

-- Enable RLS on login_activity
ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for login_activity
CREATE POLICY "Users can view their own login activity"
  ON login_activity
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own login activity"
  ON login_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add case progress tracking table
CREATE TABLE IF NOT EXISTS case_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  completed boolean DEFAULT false,
  score integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, case_id)
);

-- Enable RLS on case_progress
ALTER TABLE case_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for case_progress
CREATE POLICY "Users can view their own case progress"
  ON case_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own case progress"
  ON case_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own case progress"
  ON case_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);