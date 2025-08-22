/*
  # Update sections table structure
  
  1. Modifications:
    - Add new columns to the sections table
    - Add sample data for the medical education content
  
  2. New columns:
    - `image_url` - URL for section images
    - `category` - Category classification (e.g., Anatomy, Cardiology)
    - `content_details` - Extended description
    - `last_updated` - Timestamp for tracking updates
*/

-- Add new columns to sections table if they don't exist
ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS content_details TEXT,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT now();

-- Update existing sections with default values
UPDATE sections 
SET 
  image_url = CASE
    WHEN title LIKE '%Kardio%' THEN 'https://images.pexels.com/photos/4226883/pexels-photo-4226883.jpeg'
    WHEN title LIKE '%Gastro%' THEN 'https://images.pexels.com/photos/4226764/pexels-photo-4226764.jpeg'
    WHEN title LIKE '%Pneumo%' THEN 'https://images.pexels.com/photos/4226894/pexels-photo-4226894.jpeg'
    WHEN title LIKE '%Nephro%' THEN 'https://images.pexels.com/photos/4226766/pexels-photo-4226766.jpeg'
    WHEN title LIKE '%Endokrin%' THEN 'https://images.pexels.com/photos/4226122/pexels-photo-4226122.jpeg'
    ELSE 'https://images.pexels.com/photos/4226466/pexels-photo-4226466.jpeg'
  END,
  category = CASE 
    WHEN title LIKE '%Kardio%' OR title LIKE '%Gastro%' OR title LIKE '%Pneumo%' OR title LIKE '%Nephro%' THEN 'Innere Medizin'
    WHEN title LIKE '%Chirurgie%' THEN 'Chirurgie'
    WHEN title LIKE '%Notfall%' THEN 'Notfallmedizin'
    WHEN title LIKE '%Pädiatrie%' THEN 'Pädiatrie'
    WHEN title LIKE '%Gynäkologie%' THEN 'Gynäkologie'
    WHEN title LIKE '%Psychiatrie%' THEN 'Psychiatrie'
    ELSE 'Sonstiges'
  END,
  content_details = COALESCE(description, ''),
  last_updated = now()
WHERE image_url IS NULL;

-- Insert sample sections if they don't exist
INSERT INTO sections (slug, title, parent_slug, description, type, icon, color, display_order, image_url, category, content_details)
SELECT * FROM (
  VALUES 
    ('anatomie-herz', 'Anatomie des Herzens', NULL, 'Interaktive Darstellung der Herzanatomie', 'folder', 'Heart', '#EF4444', 100, 'https://images.pexels.com/photos/3970330/pexels-photo-3970330.jpeg', 'Anatomie', 'Das Herz ist ein faustgroßes, muskuläres Hohlorgan, das beim Erwachsenen etwa 300 g wiegt und im Mediastinum zwischen den beiden Lungenflügeln liegt. Es besteht aus vier Kammern: zwei Vorhöfen (Atrien) und zwei Hauptkammern (Ventrikel).'),
    ('ekg-grundlagen', 'EKG-Grundlagen', NULL, 'Grundlegende Prinzipien der Elektrokardiografie', 'folder', 'Activity', '#EF4444', 103, 'https://images.pexels.com/photos/8832898/pexels-photo-8832898.jpeg', 'Kardiologie', 'Das Elektrokardiogramm (EKG) ist eine Methode zur Aufzeichnung der elektrischen Aktivität des Herzens. Es dient der Diagnose von Herzrhythmusstörungen, Durchblutungsstörungen und strukturellen Herzerkrankungen.'),
    ('bildgebung-thorax', 'Bildgebung des Thorax', NULL, 'Radiologische Verfahren zur Thoraxdiagnostik', 'folder', 'Scan', '#22C55E', 104, 'https://images.pexels.com/photos/6476072/pexels-photo-6476072.jpeg', 'Radiologie', 'Die Bildgebung des Thorax umfasst verschiedene Verfahren wie Röntgen-Thorax, CT-Thorax, MRT und Ultraschall. Das Röntgen-Thorax ist die am häufigsten durchgeführte radiologische Untersuchung.'),
    ('sono-abdomen', 'Abdomensonographie', NULL, 'Ultraschalluntersuchung des Abdomens', 'folder', 'Scan', '#0077B6', 109, 'https://images.pexels.com/photos/5407206/pexels-photo-5407206.jpeg', 'Sonographie', 'Die Abdomensonographie ist eine nicht-invasive Ultraschalluntersuchung zur Beurteilung der Bauchorgane wie Leber, Gallenblase, Gallenwege, Pankreas, Milz und Nieren sowie der großen Gefäße.')
) AS new_values(slug, title, parent_slug, description, type, icon, color, display_order, image_url, category, content_details)
WHERE NOT EXISTS (SELECT 1 FROM sections WHERE slug = new_values.slug);

-- Create child sections for heart anatomy
INSERT INTO sections (slug, title, parent_slug, description, type, icon, color, display_order, image_url, category, content_details)
SELECT * FROM (
  VALUES 
    ('herzkammern', 'Herzkammern', 'anatomie-herz', 'Struktur und Funktion der Herzkammern', 'file-text', 'Heart', '#EF4444', 1, 'https://images.pexels.com/photos/6476088/pexels-photo-6476088.jpeg', 'Anatomie', 'Die Herzkammern (Ventrikel) sind die Hauptpumpkammern des Herzens. Der rechte Ventrikel pumpt sauerstoffarmes Blut in die Lungenarterien, während der linke Ventrikel sauerstoffreiches Blut in die Aorta und den Körperkreislauf pumpt.'),
    ('herzklappen', 'Herzklappen', 'anatomie-herz', 'Die vier Herzklappen und ihre Funktion', 'file-text', 'Heart', '#EF4444', 2, 'https://images.pexels.com/photos/6757577/pexels-photo-6757577.jpeg', 'Anatomie', 'Die vier Herzklappen sorgen für einen gerichteten Blutfluss im Herzen. Die Trikuspidalklappe liegt zwischen rechtem Vorhof und rechter Kammer, die Pulmonalklappe zwischen rechter Kammer und Lungenarterie, die Mitralklappe zwischen linkem Vorhof und linker Kammer, und die Aortenklappe zwischen linker Kammer und Aorta.'),
    ('koronararterien', 'Koronararterien', 'anatomie-herz', 'Blutversorgung des Herzens', 'file-text', 'Heart', '#EF4444', 3, 'https://images.pexels.com/photos/4226769/pexels-photo-4226769.jpeg', 'Anatomie', 'Die Koronararterien (Herzkranzgefäße) versorgen das Herzmuskelgewebe mit Sauerstoff und Nährstoffen. Die linke Koronararterie (LCA) teilt sich in den Ramus interventricularis anterior (RIVA) und den Ramus circumflexus (RCX), während die rechte Koronararterie (RCA) die Hinterwand des linken Ventrikels und Teile des rechten Ventrikels versorgt.')
) AS new_values(slug, title, parent_slug, description, type, icon, color, display_order, image_url, category, content_details)
WHERE NOT EXISTS (SELECT 1 FROM sections WHERE slug = new_values.slug);

-- Create child sections for EKG basics
INSERT INTO sections (slug, title, parent_slug, description, type, icon, color, display_order, image_url, category, content_details)
SELECT * FROM (
  VALUES 
    ('ekg-ableitungen', 'EKG-Ableitungen', 'ekg-grundlagen', 'Die 12 Standard-Ableitungen im EKG', 'file-text', 'Activity', '#EF4444', 1, 'https://images.pexels.com/photos/6130669/pexels-photo-6130669.jpeg', 'Kardiologie', 'Das Standard-EKG besteht aus 12 Ableitungen: 6 Extremitätenableitungen (I, II, III, aVR, aVL, aVF) und 6 Brustwandableitungen (V1-V6). Die Extremitätenableitungen erfassen die elektrische Herzaktivität in der Frontalebene, während die Brustwandableitungen die Horizontalebene erfassen.'),
    ('ekg-interpretation', 'EKG-Interpretation', 'ekg-grundlagen', 'Systematische Analyse eines EKGs', 'file-text', 'Activity', '#EF4444', 2, 'https://images.pexels.com/photos/6822287/pexels-photo-6822287.jpeg', 'Kardiologie', 'Die systematische EKG-Analyse umfasst die Beurteilung von Rhythmus, Frequenz, Lagetyp, P-Welle, PQ-Zeit, QRS-Komplex, ST-Strecke, T-Welle und QT-Zeit. Eine strukturierte Vorgehensweise ist wichtig, um keine relevanten Befunde zu übersehen.'),
    ('herzrhythmusstoerungen', 'Herzrhythmusstörungen im EKG', 'ekg-grundlagen', 'EKG-Diagnostik bei Arrhythmien', 'file-text', 'Activity', '#EF4444', 3, 'https://images.pexels.com/photos/4226894/pexels-photo-4226894.jpeg', 'Kardiologie', 'Herzrhythmusstörungen zeigen charakteristische EKG-Veränderungen. Supraventrikuläre Arrhythmien wie Vorhofflimmern, Vorhofflattern und supraventrikuläre Tachykardien sowie ventrikuläre Arrhythmien wie ventrikuläre Extrasystolen, ventrikuläre Tachykardie und Kammerflimmern können anhand des EKG-Musters diagnostiziert werden.')
) AS new_values(slug, title, parent_slug, description, type, icon, color, display_order, image_url, category, content_details)
WHERE NOT EXISTS (SELECT 1 FROM sections WHERE slug = new_values.slug);