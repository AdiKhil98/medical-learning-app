/*
  # Add educational content fields to sections table

  1. New Fields
    - `image_url` (text) - URL to section image
    - `category` (text) - Section category for grouping
    - `content_details` (text) - Detailed content information
    - `last_updated` (timestamptz) - Last update timestamp

  2. Add sample educational content
    - Anatomy sections with detailed images
    - Medical procedures with visual guides
*/

-- Add new fields to sections table
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

-- Add educational content sections
INSERT INTO sections (slug, title, parent_slug, description, type, icon, color, display_order, image_url, category, content_details, last_updated)
VALUES 
  ('anatomie-herz', 'Anatomie des Herzens', NULL, 'Interaktive Darstellung der Herzanatomie', 'folder', 'Heart', '#EF4444', 100, 'https://images.pexels.com/photos/3970330/pexels-photo-3970330.jpeg', 'Anatomie', 'Das Herz ist ein faustgroßes, muskuläres Hohlorgan, das beim Erwachsenen etwa 300 g wiegt und im Mediastinum zwischen den beiden Lungenflügeln liegt. Es besteht aus vier Kammern: zwei Vorhöfen (Atrien) und zwei Hauptkammern (Ventrikel). Die rechte Herzhälfte pumpt sauerstoffarmes Blut in den Lungenkreislauf, während die linke Herzhälfte sauerstoffreiches Blut in den Körperkreislauf pumpt.', now()),
  
  ('anatomie-lunge', 'Anatomie der Lunge', NULL, 'Interaktive Darstellung der Lungenanatomie', 'folder', 'Activity', '#22C55E', 101, 'https://images.pexels.com/photos/5726842/pexels-photo-5726842.jpeg', 'Anatomie', 'Die Lunge ist das zentrale Organ der Atmung und dient dem Gasaustausch. Sie besteht aus zwei Lungenflügeln, die wiederum in Lungenlappen unterteilt sind. Der rechte Lungenflügel besteht aus drei Lappen, der linke aus zwei. Die Lungen werden von der Pleura (Lungenfell) umhüllt, die aus einem viszeralen und einem parietalen Blatt besteht. Zwischen diesen Blättern befindet sich ein kapillarer Spalt mit Flüssigkeit, der die Reibung bei der Atmung reduziert.', now()),
  
  ('anatomie-gehirn', 'Anatomie des Gehirns', NULL, 'Interaktive Darstellung der Gehirnanatomie', 'folder', 'Brain', '#8B5CF6', 102, 'https://images.pexels.com/photos/2156881/pexels-photo-2156881.jpeg', 'Anatomie', 'Das Gehirn ist das zentrale Steuerorgan des menschlichen Körpers und Teil des Zentralnervensystems (ZNS). Es wiegt durchschnittlich 1,3-1,4 kg und besteht aus dem Großhirn (Cerebrum), dem Kleinhirn (Cerebellum) und dem Hirnstamm. Das Großhirn ist in zwei Hemisphären und vier Lappen unterteilt: Frontallappen, Parietallappen, Temporallappen und Okzipitallappen. Das Gehirn ist von drei Hirnhäuten umgeben: Dura mater, Arachnoidea und Pia mater.', now()),
  
  ('ekg-grundlagen', 'EKG-Grundlagen', NULL, 'Grundlegende Prinzipien der Elektrokardiografie', 'file-text', 'Activity', '#EF4444', 103, 'https://images.pexels.com/photos/8832898/pexels-photo-8832898.jpeg', 'Kardiologie', 'Das Elektrokardiogramm (EKG) ist eine Methode zur Aufzeichnung der elektrischen Aktivität des Herzens. Es dient der Diagnose von Herzrhythmusstörungen, Durchblutungsstörungen und strukturellen Herzerkrankungen. Das Standard-EKG besteht aus 12 Ableitungen: 6 Extremitätenableitungen (I, II, III, aVR, aVL, aVF) und 6 Brustwandableitungen (V1-V6). Die P-Welle repräsentiert die Vorhoferregung, der QRS-Komplex die Kammererregung und die T-Welle die Repolarisation der Kammern.', now()),
  
  ('bildgebung-thorax', 'Bildgebung des Thorax', NULL, 'Radiologische Verfahren zur Thoraxdiagnostik', 'folder', 'Activity', '#22C55E', 104, 'https://images.pexels.com/photos/6476072/pexels-photo-6476072.jpeg', 'Radiologie', 'Die Bildgebung des Thorax umfasst verschiedene Verfahren wie Röntgen-Thorax, CT-Thorax, MRT und Ultraschall. Das Röntgen-Thorax ist die am häufigsten durchgeführte radiologische Untersuchung und ermöglicht die Beurteilung von Lunge, Herz, Mediastinum und knöchernen Strukturen. Die CT bietet eine detailliertere Darstellung und ist besonders geeignet für die Diagnostik von Lungenerkrankungen, Mediastinaltumoren und Pleuraerkrankungen.', now()),

  ('anatomie-niere', 'Anatomie der Niere', NULL, 'Struktureller Aufbau und Funktion der Niere', 'folder', 'Circle', '#8B5CF6', 105, 'https://images.pexels.com/photos/7659574/pexels-photo-7659574.jpeg', 'Anatomie', 'Die Nieren sind paarige, bohnenförmige Organe, die im Retroperitonealraum liegen. Jede Niere ist etwa 11-12 cm lang und wiegt ca. 150 g. Die Niere besteht aus Nierenrinde (Cortex) und Nierenmark (Medulla). Die funktionelle Einheit ist das Nephron, bestehend aus Glomerulus, proximalen Tubulus, Henle-Schleife, distalen Tubulus und Sammelrohr. Die Nieren dienen der Filtration des Blutes, der Ausscheidung von Stoffwechselendprodukten, der Regulation des Wasser- und Elektrolythaushalts sowie des Säure-Basen-Gleichgewichts.', now()),

  ('haut-anatomie', 'Anatomie der Haut', NULL, 'Aufbau und Funktionen der menschlichen Haut', 'folder', 'Syringe', '#10B981', 106, 'https://images.pexels.com/photos/6476678/pexels-photo-6476678.jpeg', 'Anatomie', 'Die Haut ist das größte Organ des Menschen und besteht aus drei Schichten: Epidermis (Oberhaut), Dermis (Lederhaut) und Subkutis (Unterhaut). Die Epidermis ist die äußerste Schicht und bildet eine Barriere gegen Umwelteinflüsse. Die Dermis enthält Blutgefäße, Nervenendigungen, Schweiß- und Talgdrüsen sowie Haarfollikel. Die Subkutis besteht hauptsächlich aus Fettgewebe und dient als Energiespeicher, Wärmeisolator und mechanischer Schutz.', now()),

  ('ct-grundlagen', 'Computertomographie', NULL, 'Prinzipien und Anwendung der CT-Diagnostik', 'file-text', 'Circle', '#6366F1', 107, 'https://images.pexels.com/photos/7089401/pexels-photo-7089401.jpeg', 'Radiologie', 'Die Computertomographie (CT) ist ein bildgebendes Verfahren, das Röntgenstrahlen verwendet, um Schnittbilder des Körpers zu erzeugen. Im Gegensatz zur konventionellen Röntgenaufnahme, bei der Strukturen überlagert werden, ermöglicht die CT eine überlagerungsfreie Darstellung der anatomischen Strukturen. Die moderne Mehrschicht-CT (MSCT) erlaubt die schnelle Akquisition großer Datensätze mit hoher räumlicher Auflösung und die multiplanare Rekonstruktion der Bilder in verschiedenen Ebenen.', now()),

  ('mrt-grundlagen', 'Magnetresonanztomographie', NULL, 'Grundlagen der MRT-Bildgebung', 'file-text', 'Zap', '#EC4899', 108, 'https://images.pexels.com/photos/6476088/pexels-photo-6476088.jpeg', 'Radiologie', 'Die Magnetresonanztomographie (MRT) ist ein nicht-invasives bildgebendes Verfahren, das ein starkes Magnetfeld und Radiowellen verwendet, um detaillierte Bilder der Organe und Gewebe im Körper zu erzeugen. Im Gegensatz zur CT werden keine ionisierenden Strahlen verwendet. Die MRT eignet sich besonders gut zur Darstellung von Weichteilgewebe und wird häufig zur Untersuchung von Gehirn, Rückenmark, Muskeln, Gelenken und inneren Organen eingesetzt.', now()),

  ('sono-abdomen', 'Abdomensonographie', NULL, 'Ultraschalluntersuchung des Abdomens', 'file-text', 'Soup', '#0077B6', 109, 'https://images.pexels.com/photos/5407206/pexels-photo-5407206.jpeg', 'Sonographie', 'Die Abdomensonographie ist eine nicht-invasive Ultraschalluntersuchung zur Beurteilung der Bauchorgane wie Leber, Gallenblase, Gallenwege, Pankreas, Milz und Nieren sowie der großen Gefäße (Aorta, V. cava). Sie dient der Diagnostik von Organveränderungen, Raumforderungen, Zysten, Steinen und Flüssigkeitsansammlungen. Die Untersuchung ist schmerzfrei, strahlenarm und kann beliebig oft wiederholt werden.', now());