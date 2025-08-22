/*
  # Initial schema setup for KP App

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `role` (text)
      - `created_at` (timestamp)

    - `cases`
      - `id` (uuid, primary key)
      - `category` (text)
      - `subsection` (text)
      - `title` (text)
      - `scenario` (text)
      - `anamnesis` (text)
      - `exam` (text)
      - `labs` (text)
      - `imaging` (text)
      - `answer` (text)
      - `created_at` (timestamp)

    - `attempts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key → users.id)
      - `case_id` (uuid, foreign key → cases.id)
      - `user_answer` (text)
      - `score` (integer)
      - `created_at` (timestamp)

    - `flashcards`
      - `id` (uuid, primary key)
      - `category` (text)
      - `front` (text)
      - `back` (text)
      - `is_learned` (boolean)
      - `created_at` (timestamp)

    - `user_flashcards`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key → users.id)
      - `flashcard_id` (uuid, foreign key → flashcards.id)
      - `is_learned` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- Create cases table
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  subsection text NOT NULL,
  title text NOT NULL,
  scenario text NOT NULL,
  anamnesis text NOT NULL,
  exam text NOT NULL,
  labs text NOT NULL,
  imaging text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create attempts table
CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  user_answer text NOT NULL,
  score integer,
  created_at timestamptz DEFAULT now()
);

-- Create flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  is_learned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_flashcards table (junction table for users and flashcards)
CREATE TABLE IF NOT EXISTS user_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  flashcard_id uuid REFERENCES flashcards(id) ON DELETE CASCADE NOT NULL,
  is_learned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, flashcard_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_flashcards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users table policies
CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Cases table policies (all authenticated users can read)
CREATE POLICY "Authenticated users can view all cases"
  ON cases
  FOR SELECT
  TO authenticated
  USING (true);

-- Attempts table policies
CREATE POLICY "Users can view their own attempts"
  ON attempts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts"
  ON attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Flashcards table policies (all authenticated users can read)
CREATE POLICY "Authenticated users can view all flashcards"
  ON flashcards
  FOR SELECT
  TO authenticated
  USING (true);

-- User_flashcards table policies
CREATE POLICY "Users can view their own flashcard progress"
  ON user_flashcards
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard progress"
  ON user_flashcards
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcard progress"
  ON user_flashcards
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);