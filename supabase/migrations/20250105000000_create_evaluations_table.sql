-- Create evaluations table for storing AI-generated evaluation results
-- This table stores the results of KP and FSP exam simulations

CREATE TABLE IF NOT EXISTS evaluations (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User reference
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Exam metadata
  exam_type VARCHAR(10) CHECK (exam_type IN ('FSP', 'KP')), -- Type of exam
  conversation_type VARCHAR(20) CHECK (conversation_type IN ('patient', 'examiner', 'anamnese', 'full')), -- Type of conversation
  phase VARCHAR(50), -- e.g., 'ANAMNESE', 'VOLLSTÄNDIGE KONSULTATION', 'DIAGNOSE'

  -- Raw evaluation text from AI
  evaluation_text TEXT NOT NULL, -- Full evaluation text from AI prompt
  raw_text TEXT, -- Alias/backup field for evaluation text

  -- Extracted fields for quick access (parsed from evaluation_text)
  score INTEGER CHECK (score >= 0 AND score <= 100), -- Total score out of 100
  passed BOOLEAN, -- Whether the evaluation passed (typically >= 60)

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluations_exam_type ON evaluations(exam_type);
CREATE INDEX IF NOT EXISTS idx_evaluations_passed ON evaluations(passed);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_evaluations_updated_at
  BEFORE UPDATE ON evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Users can read their own evaluations
CREATE POLICY "Users can read their own evaluations"
  ON evaluations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own evaluations
CREATE POLICY "Users can insert their own evaluations"
  ON evaluations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own evaluations
CREATE POLICY "Users can update their own evaluations"
  ON evaluations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own evaluations
CREATE POLICY "Users can delete their own evaluations"
  ON evaluations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant access
GRANT ALL ON evaluations TO authenticated;
GRANT SELECT ON evaluations TO anon;

-- Add helpful comments
COMMENT ON TABLE evaluations IS 'Stores AI-generated evaluation results for exam simulations';
COMMENT ON COLUMN evaluations.evaluation_text IS 'Full evaluation text from AI in markdown format with emojis';
COMMENT ON COLUMN evaluations.score IS 'Total score out of 100, extracted from evaluation_text';
COMMENT ON COLUMN evaluations.passed IS 'Whether the exam was passed (typically score >= 60)';
COMMENT ON COLUMN evaluations.phase IS 'Exam phase like ANAMNESE, DIAGNOSE, THERAPIE, etc.';
