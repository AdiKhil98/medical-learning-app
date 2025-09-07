-- Fix escape sequences in medical content database
-- This script cleans up \n\n, \n, \r, \t sequences in all content columns

-- First, let's see what we're dealing with
SELECT 
  slug, 
  title,
  CASE 
    WHEN content_improved::text LIKE '%\\n%' OR content_improved::text LIKE '%\\r%' OR content_improved::text LIKE '%\\t%' THEN 'content_improved has escape sequences'
    ELSE 'clean'
  END as content_improved_status,
  CASE 
    WHEN content_html LIKE '%\\n%' OR content_html LIKE '%\\r%' OR content_html LIKE '%\\t%' THEN 'content_html has escape sequences'
    ELSE 'clean'
  END as content_html_status,
  CASE 
    WHEN content_details LIKE '%\\n%' OR content_details LIKE '%\\r%' OR content_details LIKE '%\\t%' THEN 'content_details has escape sequences'
    ELSE 'clean'
  END as content_details_status
FROM sections 
WHERE 
  content_improved::text LIKE '%\\n%' 
  OR content_improved::text LIKE '%\\r%' 
  OR content_improved::text LIKE '%\\t%'
  OR content_html LIKE '%\\n%' 
  OR content_html LIKE '%\\r%' 
  OR content_html LIKE '%\\t%'
  OR content_details LIKE '%\\n%' 
  OR content_details LIKE '%\\r%' 
  OR content_details LIKE '%\\t%'
ORDER BY title;

-- Now let's fix the content_improved column (JSON content)
UPDATE sections 
SET content_improved = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(content_improved::text, '\\n\\n', ' '),
      '\\n', ' '
    ), 
    '\\r', ' '
  ), 
  '\\t', ' '
)::jsonb
WHERE content_improved::text LIKE '%\\n%' 
   OR content_improved::text LIKE '%\\r%' 
   OR content_improved::text LIKE '%\\t%';

-- Fix the content_html column
UPDATE sections 
SET content_html = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(content_html, '\\n\\n', ' '),
      '\\n', ' '
    ), 
    '\\r', ' '
  ), 
  '\\t', ' '
)
WHERE content_html LIKE '%\\n%' 
   OR content_html LIKE '%\\r%' 
   OR content_html LIKE '%\\t%';

-- Fix the content_details column
UPDATE sections 
SET content_details = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(content_details, '\\n\\n', ' '),
      '\\n', ' '
    ), 
    '\\r', ' '
  ), 
  '\\t', ' '
)
WHERE content_details LIKE '%\\n%' 
   OR content_details LIKE '%\\r%' 
   OR content_details LIKE '%\\t%';

-- Clean up any double spaces that might have been created
UPDATE sections 
SET 
  content_html = REGEXP_REPLACE(content_html, '\s+', ' ', 'g'),
  content_details = REGEXP_REPLACE(content_details, '\s+', ' ', 'g')
WHERE content_html ~ '\s{2,}' OR content_details ~ '\s{2,}';

-- For JSON content, we need to be more careful
UPDATE sections 
SET content_improved = REGEXP_REPLACE(
  content_improved::text, 
  '\s+', 
  ' ', 
  'g'
)::jsonb
WHERE content_improved::text ~ '\s{2,}';

-- Verify the fixes
SELECT 
  slug, 
  title,
  'Fixed!' as status,
  LENGTH(content_improved::text) as content_improved_length,
  LENGTH(content_html) as content_html_length,
  LENGTH(content_details) as content_details_length
FROM sections 
WHERE 
  slug IN (
    SELECT slug FROM sections 
    WHERE content_improved::text LIKE '%\\n%' 
       OR content_improved::text LIKE '%\\r%' 
       OR content_improved::text LIKE '%\\t%'
       OR content_html LIKE '%\\n%' 
       OR content_html LIKE '%\\r%' 
       OR content_html LIKE '%\\t%'
       OR content_details LIKE '%\\n%' 
       OR content_details LIKE '%\\r%' 
       OR content_details LIKE '%\\t%'
  )
ORDER BY title;

-- Final verification - should return no rows if everything is clean
SELECT 
  slug, 
  title,
  'STILL HAS ESCAPE SEQUENCES!' as warning
FROM sections 
WHERE 
  content_improved::text LIKE '%\\n%' 
  OR content_improved::text LIKE '%\\r%' 
  OR content_improved::text LIKE '%\\t%'
  OR content_html LIKE '%\\n%' 
  OR content_html LIKE '%\\r%' 
  OR content_html LIKE '%\\t%'
  OR content_details LIKE '%\\n%' 
  OR content_details LIKE '%\\r%' 
  OR content_details LIKE '%\\t%';