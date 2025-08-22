/*
  # Organize Medical Content Hierarchy

  1. Enhanced Structure
    - Add content_json field for structured content
    - Add hierarchy_level field to track depth
    - Add content_type field for better categorization
    - Update existing sections with proper hierarchy

  2. Hierarchy Levels
    - Level 1: Main Categories (Innere Medizin, Chirurgie, etc.)
    - Level 2: Subspecialties (Kardiologie, Gastroenterologie, etc.)
    - Level 3: Topic Areas (Grundlagen, Diagnostik, etc.)
    - Level 4: Specific Topics (EKG-Ableitungen, Herzkammern, etc.)
    - Level 5: Subtopics
    - Level 6: Documents/Content Pages

  3. Content Organization
    - Add structured JSON content for rich display
    - Organize images at appropriate hierarchy levels
    - Set proper content types for navigation
*/

-- Add new columns for enhanced content organization
ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS content_json JSONB,
ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'folder',
ADD COLUMN IF NOT EXISTS has_content BOOLEAN DEFAULT false;

-- Function to calculate hierarchy level based on parent relationships
CREATE OR REPLACE FUNCTION calculate_hierarchy_level(section_slug TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    level_count INTEGER := 1;
    current_parent TEXT;
BEGIN
    -- Get the parent of current section
    SELECT parent_slug INTO current_parent 
    FROM sections 
    WHERE slug = section_slug;
    
    -- Traverse up the hierarchy
    WHILE current_parent IS NOT NULL LOOP
        level_count := level_count + 1;
        
        SELECT parent_slug INTO current_parent 
        FROM sections 
        WHERE slug = current_parent;
        
        -- Safety check to prevent infinite loops
        IF level_count > 10 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN level_count;
END;
$$;

-- Update hierarchy levels for all existing sections
UPDATE sections 
SET hierarchy_level = calculate_hierarchy_level(slug);

-- Set content types based on hierarchy and existing data
UPDATE sections 
SET content_type = CASE 
    WHEN hierarchy_level = 1 THEN 'main_category'
    WHEN hierarchy_level = 2 THEN 'subspecialty'
    WHEN hierarchy_level = 3 THEN 'topic_area'
    WHEN hierarchy_level = 4 THEN 'specific_topic'
    WHEN hierarchy_level = 5 THEN 'subtopic'
    WHEN hierarchy_level >= 6 OR type = 'file-text' OR type = 'markdown' THEN 'document'
    ELSE 'folder'
END;

-- Mark sections that have actual content
UPDATE sections 
SET has_content = CASE 
    WHEN content_details IS NOT NULL AND length(trim(content_details)) > 0 THEN true
    WHEN content_type = 'document' THEN true
    ELSE false
END;

-- Create structured content for key medical topics
UPDATE sections 
SET content_json = jsonb_build_object(
    'sections', jsonb_build_array(
        jsonb_build_object(
            'type', 'overview',
            'title', 'Übersicht',
            'content', COALESCE(description, 'Grundlegende Informationen zu ' || title)
        ),
        jsonb_build_object(
            'type', 'definition',
            'term', title,
            'definition', COALESCE(content_details, description, 'Definition und Grundlagen von ' || title)
        ),
        jsonb_build_object(
            'type', 'clinical_relevance',
            'title', 'Klinische Relevanz',
            'content', 'Wichtige Aspekte für die klinische Praxis und Kenntnisprüfung.'
        )
    )
)
WHERE content_type = 'document' AND content_json IS NULL;

-- Add specific structured content for EKG topics
UPDATE sections 
SET content_json = jsonb_build_object(
    'sections', jsonb_build_array(
        jsonb_build_object(
            'type', 'overview',
            'title', 'EKG-Grundlagen',
            'content', 'Das Elektrokardiogramm (EKG) ist eine fundamentale diagnostische Methode in der Kardiologie.'
        ),
        jsonb_build_object(
            'type', 'definition',
            'term', 'Elektrokardiogramm (EKG)',
            'definition', 'Grafische Darstellung der elektrischen Aktivität des Herzens über einen bestimmten Zeitraum.'
        ),
        jsonb_build_object(
            'type', 'list',
            'title', 'EKG-Komponenten',
            'items', jsonb_build_array(
                'P-Welle: Vorhofaktivierung',
                'QRS-Komplex: Kammeraktivierung', 
                'T-Welle: Repolarisation der Kammern',
                'U-Welle: Nachpotentiale (selten sichtbar)'
            )
        ),
        jsonb_build_object(
            'type', 'clinical_pearl',
            'content', 'Ein systematischer Ansatz zur EKG-Interpretation verhindert das Übersehen wichtiger Befunde: Rhythmus → Frequenz → Achse → Intervalle → Morphologie'
        )
    )
)
WHERE slug LIKE '%ekg%' OR title ILIKE '%ekg%';

-- Add structured content for heart anatomy
UPDATE sections 
SET content_json = jsonb_build_object(
    'sections', jsonb_build_array(
        jsonb_build_object(
            'type', 'overview',
            'title', 'Anatomie des Herzens',
            'content', 'Das Herz ist ein vier-kammeriges muskuläres Hohlorgan, das als zentrale Pumpe des Kreislaufsystems fungiert.'
        ),
        jsonb_build_object(
            'type', 'list',
            'title', 'Hauptstrukturen',
            'items', jsonb_build_array(
                'Rechter Vorhof (Atrium dextrum)',
                'Rechte Kammer (Ventriculus dexter)',
                'Linker Vorhof (Atrium sinistrum)',
                'Linke Kammer (Ventriculus sinister)',
                'Herzklappen (4 Klappen)',
                'Reizleitungssystem'
            )
        ),
        jsonb_build_object(
            'type', 'definition',
            'term', 'Herzkreislauf',
            'definition', 'Das Herz pumpt Blut in zwei Kreisläufen: Lungenkreislauf (kleine Kreislauf) und Körperkreislauf (große Kreislauf).'
        ),
        jsonb_build_object(
            'type', 'clinical_pearl',
            'content', 'Die Wandstärke der linken Kammer ist etwa 3x dicker als die der rechten Kammer, da sie gegen den höheren systemischen Widerstand arbeiten muss.'
        )
    )
)
WHERE slug LIKE '%anatomie-herz%' OR slug LIKE '%herzkammern%' OR slug LIKE '%herzklappen%';

-- Set appropriate image URLs based on hierarchy level
-- Images should be at the level before the final content
UPDATE sections 
SET image_url = CASE 
    WHEN hierarchy_level = 1 AND image_url IS NULL THEN 
        'https://images.pexels.com/photos/4226466/pexels-photo-4226466.jpeg'
    WHEN hierarchy_level = 2 AND title ILIKE '%kardio%' AND image_url IS NULL THEN 
        'https://images.pexels.com/photos/4226883/pexels-photo-4226883.jpeg'
    WHEN hierarchy_level = 2 AND title ILIKE '%gastro%' AND image_url IS NULL THEN 
        'https://images.pexels.com/photos/4226764/pexels-photo-4226764.jpeg'
    WHEN hierarchy_level = 2 AND title ILIKE '%pneumo%' AND image_url IS NULL THEN 
        'https://images.pexels.com/photos/4226894/pexels-photo-4226894.jpeg'
    WHEN hierarchy_level = 3 AND parent_slug IS NOT NULL AND image_url IS NULL THEN
        CASE 
            WHEN title ILIKE '%ekg%' THEN 'https://images.pexels.com/photos/8832898/pexels-photo-8832898.jpeg'
            WHEN title ILIKE '%anatomie%' THEN 'https://images.pexels.com/photos/3970330/pexels-photo-3970330.jpeg'
            WHEN title ILIKE '%radiolog%' THEN 'https://images.pexels.com/photos/6476072/pexels-photo-6476072.jpeg'
            ELSE 'https://images.pexels.com/photos/4226122/pexels-photo-4226122.jpeg'
        END
    ELSE image_url
END
WHERE hierarchy_level <= 4;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sections_hierarchy_level ON sections(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_sections_content_type ON sections(content_type);
CREATE INDEX IF NOT EXISTS idx_sections_has_content ON sections(has_content);

-- Clean up function
DROP FUNCTION calculate_hierarchy_level(TEXT);

-- Add some example deep hierarchy sections for demonstration
INSERT INTO sections (slug, title, parent_slug, description, type, icon, color, display_order, hierarchy_level, content_type, content_json, has_content)
VALUES 
-- Level 4: Specific EKG topics under EKG basics
('ekg-p-welle', 'P-Welle', 'ekg-ableitungen', 'Analyse der P-Welle im EKG', 'file-text', 'Activity', '#EF4444', 1, 4, 'document', 
 jsonb_build_object(
    'sections', jsonb_build_array(
        jsonb_build_object(
            'type', 'definition',
            'term', 'P-Welle',
            'definition', 'Die P-Welle repräsentiert die elektrische Aktivierung (Depolarisation) der Vorhöfe.'
        ),
        jsonb_build_object(
            'type', 'list',
            'title', 'Normale P-Wellen-Charakteristika',
            'items', jsonb_build_array(
                'Dauer: < 120 ms (< 3 kleine Kästchen)',
                'Amplitude: < 2,5 mm in den Extremitätenableitungen',
                'Form: rundlich, monophasisch',
                'In Ableitung II immer positiv bei Sinusrhythmus'
            )
        ),
        jsonb_build_object(
            'type', 'clinical_pearl',
            'content', 'Eine breite, doppelgipflige P-Welle (P mitrale) deutet auf eine Vergrößerung des linken Vorhofs hin.'
        )
    )
 ), true),

('ekg-qrs-komplex', 'QRS-Komplex', 'ekg-ableitungen', 'Analyse des QRS-Komplexes', 'file-text', 'Activity', '#EF4444', 2, 4, 'document',
 jsonb_build_object(
    'sections', jsonb_build_array(
        jsonb_build_object(
            'type', 'definition',
            'term', 'QRS-Komplex',
            'definition', 'Der QRS-Komplex repräsentiert die elektrische Aktivierung der Herzkammern (Ventrikel).'
        ),
        jsonb_build_object(
            'type', 'list',
            'title', 'QRS-Normwerte',
            'items', jsonb_build_array(
                'Dauer: 70-110 ms (schmal)',
                'Verbreitert: > 120 ms',
                'Amplitude: variabel je nach Ableitung',
                'Form: abhängig von Herzachse und Ableitung'
            )
        ),
        jsonb_build_object(
            'type', 'clinical_pearl',
            'content', 'Ein verbreiterter QRS-Komplex (> 120 ms) deutet auf eine intraventrikuläre Leitungsstörung hin.'
        )
    )
 ), true),

-- Level 5: Even more specific content
('ekg-qrs-morphologie', 'QRS-Morphologie', 'ekg-qrs-komplex', 'Detaillierte QRS-Morphologie-Analyse', 'file-text', 'Activity', '#DC2626', 1, 5, 'document',
 jsonb_build_object(
    'sections', jsonb_build_array(
        jsonb_build_object(
            'type', 'overview',
            'title', 'QRS-Morphologie-Analyse',
            'content', 'Die Morphologie des QRS-Komplexes gibt wichtige Hinweise auf die elektrische Aktivierung der Ventrikel.'
        ),
        jsonb_build_object(
            'type', 'list',
            'title', 'Morphologie-Typen',
            'items', jsonb_build_array(
                'R-Typ: Hauptsächlich positive Ausschläge',
                'S-Typ: Hauptsächlich negative Ausschläge',
                'RS-Typ: Biphasisch mit R und S',
                'QS-Typ: Vollständig negativ'
            )
        )
    )
 ), true)

ON CONFLICT (slug) DO UPDATE SET
  content_json = EXCLUDED.content_json,
  hierarchy_level = EXCLUDED.hierarchy_level,
  content_type = EXCLUDED.content_type,
  has_content = EXCLUDED.has_content;