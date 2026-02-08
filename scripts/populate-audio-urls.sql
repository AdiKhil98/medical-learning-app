-- Audio URL Population Script
-- Connects Supabase Storage audio files to database records

-- ============================================================================
-- STEP 1: Check row counts
-- ============================================================================

SELECT 'fsp_bibliothek' as table_name, COUNT(*) as total_rows, COUNT(audio_url) as with_audio FROM fsp_bibliothek
UNION ALL
SELECT 'fsp_anamnese', COUNT(*), COUNT(audio_url) FROM fsp_anamnese
UNION ALL
SELECT 'fsp_fachbegriffe', COUNT(*), COUNT(audio_url) FROM fsp_fachbegriffe
UNION ALL
SELECT 'kp_medical_content', COUNT(*), COUNT(audio_url) FROM kp_medical_content;

-- ============================================================================
-- STEP 2: List storage buckets and files (run in SQL Editor)
-- ============================================================================

-- Check available buckets
SELECT * FROM storage.buckets;

-- Check files in the audio bucket (adjust bucket name if different)
SELECT name, bucket_id, created_at
FROM storage.objects
WHERE bucket_id = 'audio'
ORDER BY name
LIMIT 50;

-- ============================================================================
-- STEP 3: Populate audio_url from Supabase Storage
-- Replace 'YOUR_PROJECT_ID' with your actual project ID
-- Adjust bucket name and folder paths to match your storage structure
-- ============================================================================

-- Pattern: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]/[filename]

-- FSP Bibliothek (assuming files are named by slug)
UPDATE fsp_bibliothek
SET audio_url = 'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/audio/fsp-bibliothek/' || slug || '.mp3'
WHERE audio_url IS NULL;

-- FSP Anamnese
UPDATE fsp_anamnese
SET audio_url = 'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/audio/fsp-anamnese/' || slug || '.mp3'
WHERE audio_url IS NULL;

-- FSP Fachbegriffe
UPDATE fsp_fachbegriffe
SET audio_url = 'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/audio/fsp-fachbegriffe/' || slug || '.mp3'
WHERE audio_url IS NULL;

-- KP Medical Content
UPDATE kp_medical_content
SET audio_url = 'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/audio/kp/' || slug || '.mp3'
WHERE audio_url IS NULL;

-- ============================================================================
-- STEP 4: Verify
-- ============================================================================

SELECT slug, title_de, audio_url FROM fsp_bibliothek WHERE audio_url IS NOT NULL LIMIT 5;
SELECT slug, title_de, audio_url FROM kp_medical_content WHERE audio_url IS NOT NULL LIMIT 5;
