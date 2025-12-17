-- ============================================
-- DIRECT QUOTA FIX - Force update to correct value
-- Date: 2025-12-17
-- ============================================

-- First, let's see what we're fixing
SELECT
  'Current incorrect value' as note,
  email,
  simulations_used_this_month as wrong_value,
  26 as correct_value,
  'Should be 26, not 349' as explanation
FROM users
WHERE id = '66da816e-844c-4e8a-85af-e7e286124133';

-- Now force update to the correct value (26)
UPDATE users
SET simulations_used_this_month = 26
WHERE id = '66da816e-844c-4e8a-85af-e7e286124133';

-- Verify the fix
SELECT
  'Fixed!' as note,
  email,
  simulations_used_this_month as corrected_value,
  'Refresh your page now' as action
FROM users
WHERE id = '66da816e-844c-4e8a-85af-e7e286124133';
