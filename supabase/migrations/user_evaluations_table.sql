-- Create user_evaluations table
CREATE TABLE user_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  evaluation_name text NOT NULL,
  score text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_user_evaluations_user_id ON user_evaluations(user_id);
CREATE INDEX idx_user_evaluations_created_at ON user_evaluations(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE user_evaluations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own evaluations
CREATE POLICY "Users can read their own evaluations" ON user_evaluations
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can insert evaluations (for webhook)
CREATE POLICY "Service role can insert evaluations" ON user_evaluations
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own evaluations
CREATE POLICY "Users can update their own evaluations" ON user_evaluations
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Admins can read all evaluations
CREATE POLICY "Admins can read all evaluations" ON user_evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_evaluations_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_evaluations_updated_at 
  BEFORE UPDATE ON user_evaluations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_user_evaluations_updated_at_column();