-- Fix daily tips and questions schema to match exact requirements
-- This migration updates the tables to use the correct column structure

-- First, drop existing tables to recreate with correct schema
DROP TABLE IF EXISTS daily_tips CASCADE;
DROP TABLE IF EXISTS daily_questions CASCADE;

-- Create daily_tips table with exact required columns
CREATE TABLE daily_tips (
  date date PRIMARY KEY,
  tip_content text NOT NULL
);

-- Create daily_questions table with exact required columns
CREATE TABLE daily_questions (
  date date PRIMARY KEY,
  question text NOT NULL,
  choice_a text NOT NULL,
  choice_b text NOT NULL,
  choice_c text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('a', 'b', 'c'))
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

CREATE POLICY "Admins can delete daily tips"
  ON daily_tips
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

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

CREATE POLICY "Admins can delete daily questions"
  ON daily_questions
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add sample data for testing
INSERT INTO daily_tips (date, tip_content) VALUES
('2025-08-27', 'Die P-Welle repräsentiert die Vorhofaktivierung und sollte in Ableitung II bei Sinusrhythmus immer positiv sein. Eine fehlende P-Welle kann auf Vorhofflimmern hindeuten.');

INSERT INTO daily_questions (date, question, choice_a, choice_b, choice_c, correct_answer) VALUES
('2025-08-27', 'Welche Herzfrequenz gilt als normale Ruheherzfrequenz bei Erwachsenen?', '40-60 Schläge/min', '60-100 Schläge/min', '100-120 Schläge/min', 'b');