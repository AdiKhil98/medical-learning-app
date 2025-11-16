-- Add html_report column to evaluations table
-- This column stores pre-generated HTML evaluation reports from Make.com
-- which can be displayed directly in a WebView without client-side parsing

-- Add the column
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS html_report TEXT;

-- Add index for performance (optional, but helpful for queries)
CREATE INDEX IF NOT EXISTS idx_evaluations_html_report_exists
  ON evaluations((html_report IS NOT NULL));

-- Add helpful comment
COMMENT ON COLUMN evaluations.html_report IS 'Pre-generated HTML evaluation report from Make.com, ready to display in WebView. Null for legacy evaluations created before this feature.';

-- Note: No data migration needed - old evaluations will keep evaluation_text
-- and new evaluations from Make.com will populate html_report
