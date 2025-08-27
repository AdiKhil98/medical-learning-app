/*
  # Create daily tips and questions tables

  1. New Tables
    - `daily_tips`
      - `id` (uuid, primary key)
      - `date` (date, unique)
      - `title` (text)
      - `content` (text)
      - `category` (text)
      - `created_at` (timestamp)

    - `daily_questions`
      - `id` (uuid, primary key)
      - `date` (date, unique)
      - `question` (text)
      - `option_a` (text)
      - `option_b` (text)
      - `option_c` (text)
      - `correct_answer` (text) -- 'A', 'B', or 'C'
      - `explanation` (text)
      - `category` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read
    - Add policies for admins to write/update
*/

-- Create daily_tips table
CREATE TABLE IF NOT EXISTS daily_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

-- Create daily_questions table
CREATE TABLE IF NOT EXISTS daily_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('A', 'B', 'C')),
  explanation text,
  category text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE daily_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for daily_tips
CREATE POLICY "Authenticated users can read daily tips"
  ON daily_tips
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert daily tips"
  ON daily_tips
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update daily tips"
  ON daily_tips
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create RLS policies for daily_questions
CREATE POLICY "Authenticated users can read daily questions"
  ON daily_questions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert daily questions"
  ON daily_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update daily questions"
  ON daily_questions
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Add some sample data for today and upcoming days
INSERT INTO daily_tips (date, title, content, category) VALUES
(CURRENT_DATE, 'EKG-Grundlagen', 'Die P-Welle repräsentiert die Vorhofaktivierung und sollte in Ableitung II bei Sinusrhythmus immer positiv sein. Eine fehlende P-Welle kann auf Vorhofflimmern hindeuten.', 'Kardiologie'),
(CURRENT_DATE + INTERVAL '1 day', 'Blutdruckmessung', 'Für eine korrekte Blutdruckmessung sollte der Patient 5 Minuten ruhig sitzen, die Manschette sollte 80% des Oberarmumfangs bedecken und auf Herzhöhe positioniert sein.', 'Innere Medizin'),
(CURRENT_DATE + INTERVAL '2 days', 'Auskultation', 'Bei der Herzauskultation sollten Sie systematisch alle vier Klappenpunkte abhören: Aortenklappe (2. ICR rechts), Pulmonalklappe (2. ICR links), Trikuspidalklappe (4. ICR links) und Mitralklappe (5. ICR links).', 'Kardiologie');

INSERT INTO daily_questions (date, question, option_a, option_b, option_c, correct_answer, explanation, category) VALUES
(CURRENT_DATE, 'Welche Herzfrequenz gilt als normale Ruheherzfrequenz bei Erwachsenen?', '40-60 Schläge/min', '60-100 Schläge/min', '100-120 Schläge/min', 'B', 'Die normale Ruheherzfrequenz bei Erwachsenen liegt zwischen 60-100 Schlägen pro Minute. Werte unter 60 werden als Bradykardie, Werte über 100 als Tachykardie bezeichnet.', 'Kardiologie'),
(CURRENT_DATE + INTERVAL '1 day', 'Was ist der normale Blutdruckwert für Erwachsene?', 'Systolisch <120 mmHg, Diastolisch <80 mmHg', 'Systolisch <140 mmHg, Diastolisch <90 mmHg', 'Systolisch <160 mmHg, Diastolisch <100 mmHg', 'A', 'Optimaler Blutdruck liegt bei systolisch <120 mmHg und diastolisch <80 mmHg. Werte ab 140/90 mmHg gelten als Hypertonie.', 'Innere Medizin'),
(CURRENT_DATE + INTERVAL '2 days', 'Welches EKG-Zeichen ist typisch für einen Myokardinfarkt?', 'Verlängerte QT-Zeit', 'ST-Hebung', 'Verbreiterte P-Welle', 'B', 'ST-Hebungen sind ein klassisches Zeichen für einen akuten Myokardinfarkt (STEMI) und erfordern sofortige Reperfusionstherapie.', 'Kardiologie');