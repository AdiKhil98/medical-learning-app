-- Add increment functions for subscription usage tracking
-- Migration: 20250929000002_add_increment_functions

-- Function to increment free simulations usage
CREATE OR REPLACE FUNCTION increment_free_simulations(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET free_simulations_used = free_simulations_used + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment monthly simulations usage
CREATE OR REPLACE FUNCTION increment_monthly_simulations(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET simulations_used_this_month = simulations_used_this_month + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON FUNCTION increment_free_simulations(UUID) IS 'Increments free simulations used counter for a user';
COMMENT ON FUNCTION increment_monthly_simulations(UUID) IS 'Increments monthly simulations used counter for a user';