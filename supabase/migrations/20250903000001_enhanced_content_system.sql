-- Enhanced Medical Content System
-- This migration enhances the existing content_html column with beautiful styling

-- Function to create styled HTML from medical content
CREATE OR REPLACE FUNCTION create_enhanced_medical_html(
    content_text TEXT,
    section_title TEXT DEFAULT 'Medical Content',
    section_category TEXT DEFAULT 'general'
) RETURNS TEXT AS $$
DECLARE
    html_output TEXT;
    styled_content TEXT;
BEGIN
    -- Start with the content
    styled_content := COALESCE(content_text, 'No content available.');
    
    -- Add colored badges for numbers and percentages
    styled_content := regexp_replace(styled_content, 
        '\b(\d+(?:[,.-]\d+)*%?)\b', 
        '<span class="badge badge-blue">\1</span>', 'g');
    
    -- Add purple badges for medical terms (German medical terminology)
    styled_content := regexp_replace(styled_content, 
        '\b(AKI|KDIGO|ICD-10|Tubuläre|Transportprozesse|Niereninsuffizienz|Nephron|Glomerulonephritis|Tubulusnekrose|Sepsis|Hypovolämie|mmol/L|ng/L|mg/kg|Ätiologie|Pathophysiologie|Epidemiologie|Diagnostik|Therapie|Prognose|Klinik|Anamnese|Befund)\b', 
        '<span class="badge badge-purple">\1</span>', 'gi');
    
    -- Add red badges for critical terms
    styled_content := regexp_replace(styled_content, 
        '\b(akut|kritisch|Notfall|schwer|vital|lebensbedrohlich|Schock|Koma|Reanimation)\b', 
        '<span class="badge badge-red">\1</span>', 'gi');
    
    -- Add green badges for positive terms
    styled_content := regexp_replace(styled_content, 
        '\b(normal|gesund|stabil|erfolgreich|optimal|unauffällig|physiologisch)\b', 
        '<span class="badge badge-green">\1</span>', 'gi');
    
    -- Convert headers and wrap content
    styled_content := regexp_replace(styled_content, 
        '^([A-ZÄÖÜ][a-zäöüß\s]+):?\s*$', 
        '<h3 class="section-title">📋 \1</h3>', 'gm');
    
    -- Wrap content in sections
    styled_content := '<div class="content-section">' || styled_content || '</div>';
    
    -- Build complete HTML with styling
    html_output := '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; padding: 0; margin: 0; background: #f8f9fa; }
        .medical-header { background: linear-gradient(135deg, #4CAF50, #81C784); color: white; padding: 30px 20px; text-align: center; }
        .medical-header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .medical-header .subtitle { opacity: 0.9; margin-top: 8px; font-size: 16px; }
        .stats-container { display: flex; gap: 15px; padding: 20px; flex-wrap: wrap; }
        .stat-card { background: white; padding: 25px 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; flex: 1; min-width: 140px; }
        .stat-number { font-size: 32px; font-weight: bold; color: #4CAF50; margin-bottom: 8px; display: block; }
        .stat-label { color: #666; font-size: 14px; font-weight: 500; }
        .tabs-container { display: flex; gap: 8px; padding: 0 20px 20px; overflow-x: auto; }
        .tab { background: #E8F5E8; color: #2E7D32; padding: 12px 18px; border-radius: 25px; font-size: 14px; font-weight: 500; white-space: nowrap; }
        .content-section { background: white; margin: 0 20px 16px; padding: 25px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid #4CAF50; }
        .section-title { color: #2E3A59; font-size: 20px; font-weight: 600; margin: 0 0 15px 0; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 0 4px; }
        .badge-blue { background: #F8F3E8; color: #B15740; }
        .badge-purple { background: #F3E5F5; color: #7B1FA2; }
        .badge-red { background: #FFEBEE; color: #C62828; }
        .badge-green { background: #E8F5E8; color: #2E7D32; }
        p { margin: 0 0 15px 0; line-height: 1.7; font-size: 16px; }
        @media (max-width: 768px) { .stats-container { flex-direction: column; } .content-section { margin: 0 15px 12px; padding: 20px; } }
    </style>
</head>
<body>
    <div class="medical-header">
        <h1>' || section_title || '</h1>
        <div class="subtitle">Vollständiger Leitfaden für Kenntnissprüfung und Fachsprachprüfung</div>
    </div>
    <div class="stats-container">
        <div class="stat-card"><span class="stat-number">15</span><div class="stat-label">Themenbereiche</div></div>
        <div class="stat-card"><span class="stat-number">3</span><div class="stat-label">KDIGO-Stadien</div></div>
        <div class="stat-card"><span class="stat-number">60-70%</span><div class="stat-label">Prärenale Ursachen</div></div>
    </div>
    <div class="tabs-container">
        <div class="tab">Definition</div><div class="tab">Epidemiologie</div><div class="tab">Ätiologie</div>
        <div class="tab">Symptomatik</div><div class="tab">Diagnostik</div><div class="tab">Therapie</div>
    </div>
    ' || styled_content || '
    <script>
        function updateHeight() {
            const height = Math.max(document.documentElement.scrollHeight, 600);
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: "height", height: height}));
            }
        }
        document.addEventListener("DOMContentLoaded", updateHeight);
        setTimeout(updateHeight, 100);
    </script>
</body>
</html>';
    RETURN html_output;
END;
$$ LANGUAGE plpgsql;

-- Update existing sections to use enhanced HTML
UPDATE sections 
SET content_html = create_enhanced_medical_html(
    COALESCE(content_details, content_improved::text, 'Medical content'),
    title,
    category
)
WHERE content_html IS NULL OR content_html = '' OR content_html NOT LIKE '%medical-header%';

COMMIT;
