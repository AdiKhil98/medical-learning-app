-- Simple fix for escape sequences in medical content
-- Run these queries one by one in Supabase SQL Editor

-- 1. Check which records have the problem
SELECT slug, title, 
       CASE WHEN content_details LIKE '%\\n%' THEN 'HAS ESCAPE SEQUENCES' ELSE 'CLEAN' END as status
FROM sections 
WHERE content_details LIKE '%\\n%' OR content_details LIKE '%\\r%' OR content_details LIKE '%\\t%'
LIMIT 10;

-- 2. Fix content_details column (most likely where the issue is)
UPDATE sections 
SET content_details = REPLACE(REPLACE(REPLACE(content_details, '\\n\\n', ' '), '\\n', ' '), '\\t', ' ')
WHERE content_details LIKE '%\\n%' OR content_details LIKE '%\\t%';

-- 3. Fix content_html column if needed  
UPDATE sections 
SET content_html = REPLACE(REPLACE(REPLACE(content_html, '\\n\\n', ' '), '\\n', ' '), '\\t', ' ')
WHERE content_html LIKE '%\\n%' OR content_html LIKE '%\\t%';

-- 4. Clean up double spaces
UPDATE sections 
SET content_details = REGEXP_REPLACE(content_details, '\\s+', ' ', 'g'),
    content_html = REGEXP_REPLACE(COALESCE(content_html, ''), '\\s+', ' ', 'g')
WHERE content_details ~ '\\s{2,}' OR content_html ~ '\\s{2,}';

-- 5. Verify the fix worked
SELECT slug, title, 
       CASE WHEN content_details LIKE '%\\n%' THEN '❌ STILL HAS ISSUES' ELSE '✅ FIXED' END as status
FROM sections 
WHERE slug LIKE '%pneumo%' OR title LIKE '%Pneumo%'
LIMIT 5;