/*
  # Add missing content columns to sections table
  
  The medicalContentService.ts expects these columns but they don't exist yet:
  - content_improved (JSONB) - structured content with sections and subsections
  - content_html (TEXT) - HTML formatted content for WebView display  
  - content_details (TEXT) - additional text details
  
  These columns were referenced in code but never properly added to the database.
*/

-- Add missing content columns
ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS content_improved JSONB,
ADD COLUMN IF NOT EXISTS content_html TEXT,
ADD COLUMN IF NOT EXISTS content_details TEXT;

-- Create indexes for better performance on the new columns
CREATE INDEX IF NOT EXISTS idx_sections_content_improved ON sections USING GIN (content_improved) WHERE content_improved IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sections_content_html ON sections(content_html) WHERE content_html IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sections_content_details ON sections(content_details) WHERE content_details IS NOT NULL;

-- Update has_content flag to include the new content columns
UPDATE sections 
SET has_content = (
  (content_json IS NOT NULL AND jsonb_array_length(content_json->'sections') > 0) OR
  (content_improved IS NOT NULL AND jsonb_array_length(content_improved) > 0) OR
  (content_html IS NOT NULL AND length(trim(content_html)) > 0) OR
  (content_details IS NOT NULL AND length(trim(content_details)) > 0)
);

-- Add some sample improved content for existing sections with content_json
UPDATE sections 
SET content_improved = content_json->'sections'
WHERE content_json IS NOT NULL AND content_json->'sections' IS NOT NULL;

-- Add some sample HTML content for key medical topics
UPDATE sections 
SET content_html = '<h2>' || title || '</h2><p>' || COALESCE(description, 'Grundlegende medizinische Informationen zu ' || title) || '</p>'
WHERE hierarchy_level >= 4 AND content_html IS NULL AND has_content = true;

-- Add sample detailed content for document-type sections  
UPDATE sections
SET content_details = 'Detaillierte Informationen zu ' || title || '. ' || COALESCE(description, 'Wichtige medizinische Grundlagen für die Kenntnisprüfung.')
WHERE content_type = 'document' AND content_details IS NULL;