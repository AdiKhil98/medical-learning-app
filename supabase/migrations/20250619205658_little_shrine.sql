/*
  # Update section icons with proper medical specialties

  1. Updates
    - Update all sections with appropriate medical icons based on their titles
    - Add proper colors for each medical specialty
    - Ensure consistency across the medical education content

  2. Icon Mappings
    - Maps medical specialties to appropriate Lucide icons
    - Uses medical specialty colors for better visual organization
*/

-- Function to determine the best icon and color for a section based on its title
CREATE OR REPLACE FUNCTION get_medical_icon_and_color(section_title text)
RETURNS TABLE(icon_name text, icon_color text)
LANGUAGE plpgsql
AS $$
DECLARE
    title_lower text := lower(trim(section_title));
BEGIN
    -- Cardiology
    IF title_lower LIKE '%kardio%' OR title_lower LIKE '%herz%' THEN
        RETURN QUERY SELECT 'Heart'::text, '#EF4444'::text;
    
    -- Internal Medicine subspecialties
    ELSIF title_lower LIKE '%innere medizin%' THEN
        RETURN QUERY SELECT 'Stethoscope'::text, '#0077B6'::text;
    ELSIF title_lower LIKE '%gastro%' OR title_lower LIKE '%verdau%' THEN
        RETURN QUERY SELECT 'Circle'::text, '#48CAE4'::text;
    ELSIF title_lower LIKE '%pneumo%' OR title_lower LIKE '%lunge%' OR title_lower LIKE '%atemweg%' THEN
        RETURN QUERY SELECT 'Lungs'::text, '#22C55E'::text;
    ELSIF title_lower LIKE '%nephro%' OR title_lower LIKE '%niere%' THEN
        RETURN QUERY SELECT 'Droplets'::text, '#8B5CF6'::text;
    ELSIF title_lower LIKE '%endokrin%' OR title_lower LIKE '%stoffwechsel%' OR title_lower LIKE '%hormon%' THEN
        RETURN QUERY SELECT 'FlaskRound'::text, '#EF4444'::text;
    ELSIF title_lower LIKE '%hämatolog%' OR title_lower LIKE '%onkolog%' THEN
        RETURN QUERY SELECT 'TestTube'::text, '#DC2626'::text;
    ELSIF title_lower LIKE '%rheumatolog%' OR title_lower LIKE '%immunolog%' THEN
        RETURN QUERY SELECT 'Shield'::text, '#7C3AED'::text;
    
    -- Surgery specialties
    ELSIF title_lower LIKE '%chirurgie%' OR title_lower LIKE '%operativ%' THEN
        RETURN QUERY SELECT 'Scissors'::text, '#48CAE4'::text;
    ELSIF title_lower LIKE '%allgemein%' AND title_lower LIKE '%chirurgie%' THEN
        RETURN QUERY SELECT 'Scissors'::text, '#0EA5E9'::text;
    ELSIF title_lower LIKE '%viszeralchirurgie%' OR title_lower LIKE '%viszeral%' THEN
        RETURN QUERY SELECT 'Scissors'::text, '#0284C7'::text;
    ELSIF title_lower LIKE '%unfall%' OR title_lower LIKE '%orthopäd%' OR title_lower LIKE '%trauma%' THEN
        RETURN QUERY SELECT 'Bone'::text, '#059669'::text;
    ELSIF title_lower LIKE '%neurochirurg%' THEN
        RETURN QUERY SELECT 'Brain'::text, '#7C2D12'::text;
    ELSIF title_lower LIKE '%thoraxchirurg%' THEN
        RETURN QUERY SELECT 'Lungs'::text, '#0F766E'::text;
    ELSIF title_lower LIKE '%herzchirurg%' THEN
        RETURN QUERY SELECT 'Heart'::text, '#BE123C'::text;
    ELSIF title_lower LIKE '%gefäß%' OR title_lower LIKE '%vascular%' THEN
        RETURN QUERY SELECT 'Activity'::text, '#C2410C'::text;
    ELSIF title_lower LIKE '%mkg%' OR title_lower LIKE '%mund%' OR title_lower LIKE '%kiefer%' THEN
        RETURN QUERY SELECT 'Smile'::text, '#9333EA'::text;
    ELSIF title_lower LIKE '%plastisch%' OR title_lower LIKE '%ästhetisch%' THEN
        RETURN QUERY SELECT 'Syringe'::text, '#BE185D'::text;
    
    -- Emergency Medicine
    ELSIF title_lower LIKE '%notfall%' OR title_lower LIKE '%emergency%' THEN
        RETURN QUERY SELECT 'AlertTriangle'::text, '#EF4444'::text;
    ELSIF title_lower LIKE '%intensiv%' OR title_lower LIKE '%icu%' THEN
        RETURN QUERY SELECT 'Cross'::text, '#DC2626'::text;
    ELSIF title_lower LIKE '%rettung%' OR title_lower LIKE '%ambulan%' THEN
        RETURN QUERY SELECT 'Ambulance'::text, '#F59E0B'::text;
    ELSIF title_lower LIKE '%reanimation%' THEN
        RETURN QUERY SELECT 'Heart'::text, '#DC2626'::text;
    ELSIF title_lower LIKE '%cabcde%' OR title_lower LIKE '%abcde%' THEN
        RETURN QUERY SELECT 'ClipboardCheck'::text, '#0077B6'::text;
    ELSIF title_lower LIKE '%schock%' THEN
        RETURN QUERY SELECT 'Activity'::text, '#F59E0B'::text;
    
    -- Pediatrics
    ELSIF title_lower LIKE '%pädiatrie%' OR title_lower LIKE '%kinder%' THEN
        RETURN QUERY SELECT 'Baby'::text, '#8B5CF6'::text;
    
    -- Obstetrics & Gynecology
    ELSIF title_lower LIKE '%gynäkolog%' OR title_lower LIKE '%geburtshilf%' THEN
        RETURN QUERY SELECT 'Users'::text, '#EC4899'::text;
    
    -- Psychiatry & Neurology
    ELSIF title_lower LIKE '%psychiatrie%' OR title_lower LIKE '%psycholog%' THEN
        RETURN QUERY SELECT 'Brain'::text, '#F59E0B'::text;
    ELSIF title_lower LIKE '%neurolog%' THEN
        RETURN QUERY SELECT 'Zap'::text, '#6366F1'::text;
    
    -- Radiology & Imaging
    ELSIF title_lower LIKE '%radiolog%' OR title_lower LIKE '%bildgeb%' THEN
        RETURN QUERY SELECT 'Scan'::text, '#22C55E'::text;
    ELSIF title_lower LIKE '%sonograph%' OR title_lower LIKE '%ultraschall%' THEN
        RETURN QUERY SELECT 'Soup'::text, '#48CAE4'::text;
    ELSIF title_lower LIKE '%ct%' OR title_lower LIKE '%computertomograph%' THEN
        RETURN QUERY SELECT 'CircuitBoard'::text, '#10B981'::text;
    ELSIF title_lower LIKE '%mrt%' OR title_lower LIKE '%kernspintomograph%' THEN
        RETURN QUERY SELECT 'Zap'::text, '#6366F1'::text;
    
    -- Infectious Diseases
    ELSIF title_lower LIKE '%infektio%' OR title_lower LIKE '%mikrobiolog%' THEN
        RETURN QUERY SELECT 'Microscope'::text, '#DC2626'::text;
    
    -- Urology
    ELSIF title_lower LIKE '%urolog%' THEN
        RETURN QUERY SELECT 'Droplets'::text, '#0369A1'::text;
    
    -- Dermatology
    ELSIF title_lower LIKE '%dermatolog%' OR title_lower LIKE '%haut%' THEN
        RETURN QUERY SELECT 'Eye'::text, '#F97316'::text;
    
    -- Ophthalmology
    ELSIF title_lower LIKE '%ophthalmolog%' OR title_lower LIKE '%auge%' THEN
        RETURN QUERY SELECT 'Eye'::text, '#0891B2'::text;
    
    -- ENT
    ELSIF title_lower LIKE '%hno%' OR title_lower LIKE '%otolaryngolog%' THEN
        RETURN QUERY SELECT 'Thermometer'::text, '#7C3AED'::text;
    
    -- Anesthesiology
    ELSIF title_lower LIKE '%anästhesi%' OR title_lower LIKE '%narkose%' THEN
        RETURN QUERY SELECT 'Syringe'::text, '#4C1D95'::text;
    
    -- Pathology
    ELSIF title_lower LIKE '%patholog%' THEN
        RETURN QUERY SELECT 'Microscope'::text, '#7F1D1D'::text;
    
    -- Laboratory Medicine
    ELSIF title_lower LIKE '%labor%' OR title_lower LIKE '%klinische chemie%' THEN
        RETURN QUERY SELECT 'TestTube'::text, '#059669'::text;
    
    -- Pharmacology
    ELSIF title_lower LIKE '%pharmakolog%' OR title_lower LIKE '%medikament%' THEN
        RETURN QUERY SELECT 'Pill'::text, '#9333EA'::text;
    
    -- Anatomy
    ELSIF title_lower LIKE '%anatomie%' THEN
        RETURN QUERY SELECT 'Heart'::text, '#0077B6'::text;
    
    -- Perioperative Management
    ELSIF title_lower LIKE '%perioperativ%' THEN
        RETURN QUERY SELECT 'Hospital'::text, '#0369A1'::text;
    
    -- Soft tissue and lymph nodes
    ELSIF title_lower LIKE '%weichteile%' OR title_lower LIKE '%lymph%' THEN
        RETURN QUERY SELECT 'Circle'::text, '#10B981'::text;
    
    -- EKG and Cardiac monitoring
    ELSIF title_lower LIKE '%ekg%' OR title_lower LIKE '%elektrokardiogr%' THEN
        RETURN QUERY SELECT 'Activity'::text, '#EF4444'::text;
    
    -- Specific clinical areas
    ELSIF title_lower LIKE '%grundlagen%' THEN
        RETURN QUERY SELECT 'BookOpen'::text, '#0077B6'::text;
    ELSIF title_lower LIKE '%diagnostik%' THEN
        RETURN QUERY SELECT 'Scan'::text, '#10B981'::text;
    ELSIF title_lower LIKE '%therapie%' THEN
        RETURN QUERY SELECT 'Pill'::text, '#8B5CF6'::text;
    ELSIF title_lower LIKE '%leitsymptome%' THEN
        RETURN QUERY SELECT 'Stethoscope'::text, '#F59E0B'::text;
    ELSIF title_lower LIKE '%ableitungen%' THEN
        RETURN QUERY SELECT 'Activity'::text, '#EF4444'::text;
    ELSIF title_lower LIKE '%interpretation%' THEN
        RETURN QUERY SELECT 'Activity'::text, '#EF4444'::text;
    ELSIF title_lower LIKE '%rhythmusstörung%' OR title_lower LIKE '%arrhythmie%' THEN
        RETURN QUERY SELECT 'Activity'::text, '#DC2626'::text;
    ELSIF title_lower LIKE '%herzkammern%' THEN
        RETURN QUERY SELECT 'Heart'::text, '#EF4444'::text;
    ELSIF title_lower LIKE '%herzklappen%' THEN
        RETURN QUERY SELECT 'Heart'::text, '#0077B6'::text;
    ELSIF title_lower LIKE '%koronar%' THEN
        RETURN QUERY SELECT 'Heart'::text, '#DC2626'::text;
    
    -- Default fallback
    ELSE
        RETURN QUERY SELECT 'BookOpen'::text, '#6B7280'::text;
    END IF;
END;
$$;

-- Update all existing sections with proper icons and colors
UPDATE sections 
SET 
    icon = icon_result.icon_name,
    color = icon_result.icon_color,
    last_updated = now()
FROM get_medical_icon_and_color(title) AS icon_result
WHERE sections.icon IS NULL 
   OR sections.icon = 'BookOpen' 
   OR sections.icon = 'Activity'
   OR sections.color IS NULL;

-- Clean up the temporary function
DROP FUNCTION get_medical_icon_and_color(text);