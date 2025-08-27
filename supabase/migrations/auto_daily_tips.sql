-- Create automatic daily tips for the next 365 days
-- This ensures there's always a tip available regardless of the current date

-- Function to generate daily tips for a year
CREATE OR REPLACE FUNCTION populate_daily_tips()
RETURNS void AS $$
DECLARE
    start_date date := CURRENT_DATE;
    end_date date := CURRENT_DATE + INTERVAL '365 days';
    current_tip_date date;
    tip_index integer := 0;
    
    -- Array of tips that will cycle
    tips_data CONSTANT text[][] := ARRAY[
        ARRAY['EKG-Grundlagen', 'Die P-Welle repräsentiert die Vorhofaktivierung und sollte in Ableitung II bei Sinusrhythmus immer positiv sein. Eine fehlende P-Welle kann auf Vorhofflimmern hindeuten.', 'Kardiologie'],
        ARRAY['Blutdruckmessung', 'Für eine korrekte Blutdruckmessung sollte der Patient 5 Minuten ruhig sitzen, die Manschette sollte 80% des Oberarmumfangs bedecken und auf Herzhöhe positioniert sein.', 'Innere Medizin'],
        ARRAY['Auskultation', 'Bei der Herzauskultation sollten Sie systematisch alle vier Klappenpunkte abhören: Aortenklappe (2. ICR rechts), Pulmonalklappe (2. ICR links), Trikuspidalklappe (4. ICR links) und Mitralklappe (5. ICR links).', 'Kardiologie'],
        ARRAY['Medikamentenwechselwirkungen', 'Marcumar (Warfarin) interagiert mit vielen Medikamenten. Besonders Antibiotika können die Wirkung verstärken. Regelmäßige INR-Kontrollen sind essentiell.', 'Pharmakologie'],
        ARRAY['Diabetes-Management', 'Bei Typ-2-Diabetes sollte der HbA1c-Wert idealerweise unter 7% liegen. Metformin ist meist die erste Wahl der medikamentösen Therapie.', 'Endokrinologie'],
        ARRAY['Notfall: Anaphylaxie', 'Bei Anaphylaxie ist Adrenalin das Mittel der ersten Wahl. 0,3-0,5mg i.m. in den Oberschenkel, kann nach 5-15 Minuten wiederholt werden.', 'Notfallmedizin'],
        ARRAY['Laborwerte', 'Erhöhte Troponin-Werte sind hochspezifisch für Myokardschäden. Bereits geringe Erhöhungen können klinisch relevant sein.', 'Labormedizin'],
        ARRAY['Antibiotika-Therapie', 'Bei der Antibiotika-Auswahl sollten lokale Resistenzlisten beachtet werden. Eine Therapiedauer von 7-10 Tagen ist meist ausreichend.', 'Infektiologie'],
        ARRAY['Schmerztherapie', 'Bei akuten Schmerzen sollte eine Schmerzskala (z.B. NRS 0-10) zur Dokumentation verwendet werden. Multimodale Therapieansätze sind oft erfolgreicher.', 'Schmerztherapie'],
        ARRAY['Neurologie-Basics', 'Bei Verdacht auf Schlaganfall ist die FAST-Regel hilfreich: Face (Gesichtlähmung), Arms (Armschwäche), Speech (Sprachstörung), Time (Zeit bis Behandlung).', 'Neurologie'],
        ARRAY['Wundbehandlung', 'Chronische Wunden sollten regelmäßig inspiziert werden. Eine feuchte Wundheilung ist meist günstiger als das Austrocknen der Wunde.', 'Chirurgie'],
        ARRAY['Impfungen', 'Die STIKO-Empfehlungen sollten regelmäßig überprüft werden. Tetanus-Auffrischung wird alle 10 Jahre empfohlen.', 'Präventivmedizin'],
        ARRAY['Gynäkologie', 'Die Krebsvorsorge sollte regelmäßig durchgeführt werden: Mammographie alle 2 Jahre ab 50, PAP-Test jährlich ab 20 Jahren.', 'Gynäkologie'],
        ARRAY['Pädiatrie', 'Bei Kindern sollten Gewicht und Größe regelmäßig in Perzentilenkurven eingetragen werden, um Entwicklungsstörungen frühzeitig zu erkennen.', 'Pädiatrie'],
        ARRAY['Psychiatrie', 'Bei Depression ist eine Kombinationstherapie aus Psychotherapie und Pharmakotherapie oft am erfolgreichsten.', 'Psychiatrie']
    ];

    -- Array of questions that will cycle  
    questions_data CONSTANT record[] := ARRAY[
        ROW('Welche Herzfrequenz gilt als normale Ruheherzfrequenz bei Erwachsenen?', '40-60 Schläge/min', '60-100 Schläge/min', '100-120 Schläge/min', 'B', 'Die normale Ruheherzfrequenz bei Erwachsenen liegt zwischen 60-100 Schlägen pro Minute. Werte unter 60 werden als Bradykardie, Werte über 100 als Tachykardie bezeichnet.', 'Kardiologie'),
        ROW('Was ist der normale Blutdruckwert für Erwachsene?', 'Systolisch <120 mmHg, Diastolisch <80 mmHg', 'Systolisch <140 mmHg, Diastolisch <90 mmHg', 'Systolisch <160 mmHg, Diastolisch <100 mmHg', 'A', 'Optimaler Blutdruck liegt bei systolisch <120 mmHg und diastolisch <80 mmHg. Werte ab 140/90 mmHg gelten als Hypertonie.', 'Innere Medizin'),
        ROW('Welches EKG-Zeichen ist typisch für einen Myokardinfarkt?', 'Verlängerte QT-Zeit', 'ST-Hebung', 'Verbreiterte P-Welle', 'B', 'ST-Hebungen sind ein klassisches Zeichen für einen akuten Myokardinfarkt (STEMI) und erfordern sofortige Reperfusionstherapie.', 'Kardiologie'),
        ROW('Welcher HbA1c-Wert ist das Therapieziel bei Diabetes mellitus Typ 2?', '<6%', '<7%', '<8%', 'B', 'Das allgemeine Therapieziel für HbA1c bei Typ-2-Diabetes liegt unter 7%. Individuelle Anpassungen sind je nach Patient möglich.', 'Endokrinologie'),
        ROW('Was ist die Erstbehandlung bei Anaphylaxie?', 'Antihistaminika i.v.', 'Adrenalin i.m.', 'Kortison i.v.', 'B', 'Adrenalin intramuskulär (0,3-0,5mg) ist die Erstbehandlung der Wahl bei Anaphylaxie. Es sollte sofort gegeben werden.', 'Notfallmedizin'),
        ROW('Welcher Laborwert ist spezifisch für Myokardschäden?', 'CK-MB', 'Troponin', 'LDH', 'B', 'Troponin ist der spezifischste Marker für Myokardschäden und ist auch bei geringen Herzmuskelschäden nachweisbar.', 'Labormedizin'),
        ROW('Welche Medikamentengruppe ist Mittel der ersten Wahl bei Typ-2-Diabetes?', 'Sulfonylharnstoffe', 'Metformin', 'Insulin', 'B', 'Metformin ist das Medikament der ersten Wahl bei Typ-2-Diabetes, da es effektiv den Blutzucker senkt und ein günstiges Nebenwirkungsprofil hat.', 'Endokrinologie'),
        ROW('Was bedeutet die Abkürzung FAST bei Schlaganfall?', 'Face-Arms-Speech-Time', 'Facial-Arterial-Stroke-Treatment', 'Fast-Action-Stroke-Therapy', 'A', 'FAST steht für Face (Gesicht), Arms (Arme), Speech (Sprache), Time (Zeit) - ein einfaches Schema zur Schlaganfall-Erkennung.', 'Neurologie'),
        ROW('Wie oft sollte eine Tetanus-Auffrischimpfung erfolgen?', 'Alle 5 Jahre', 'Alle 10 Jahre', 'Alle 15 Jahre', 'B', 'Die Tetanus-Auffrischimpfung sollte alle 10 Jahre erfolgen. Bei Verletzungen kann eine vorgezogene Auffrischung nötig sein.', 'Präventivmedizin'),
        ROW('Ab welchem Alter wird die Mammographie-Vorsorge empfohlen?', 'Ab 40 Jahren', 'Ab 45 Jahren', 'Ab 50 Jahren', 'C', 'Die Mammographie-Vorsorge wird ab dem 50. Lebensjahr alle 2 Jahre empfohlen.', 'Gynäkologie'),
        ROW('Welche Medikamentengruppe wird bei Herzinsuffizienz als erste Wahl eingesetzt?', 'Beta-Blocker', 'ACE-Hemmer', 'Diuretika', 'B', 'ACE-Hemmer sind bei Herzinsuffizienz die erste Wahl, da sie die Prognose verbessern und Symptome lindern.', 'Kardiologie'),
        ROW('Was ist ein normaler Nüchternblutzucker?', '<100 mg/dl', '<110 mg/dl', '<126 mg/dl', 'A', 'Ein normaler Nüchternblutzucker liegt unter 100 mg/dl. Werte zwischen 100-125 mg/dl gelten als gestörte Nüchternglukose.', 'Endokrinologie'),
        ROW('Welche Temperatur gilt als Fieber bei Erwachsenen?', '≥37,5°C', '≥38°C', '≥38,5°C', 'B', 'Bei Erwachsenen spricht man ab 38°C von Fieber. Subfebril ist die Temperatur zwischen 37,5-37,9°C.', 'Innere Medizin'),
        ROW('Was ist das wichtigste Symptom einer Herzinsuffizienz?', 'Brustschmerzen', 'Belastungsdyspnoe', 'Palpitationen', 'B', 'Belastungsdyspnoe (Atemnot bei Anstrengung) ist das wichtigste und häufigste Symptom einer Herzinsuffizienz.', 'Kardiologie'),
        ROW('Welcher Impfstoff sollte jährlich aufgefrischt werden?', 'Tetanus', 'Influenza', 'Hepatitis B', 'B', 'Die Influenza-Impfung sollte jährlich aufgefrischt werden, idealerweise im Herbst vor der Grippesaison.', 'Präventivmedizin')
    ];
    
BEGIN
    -- Clear existing data for the date range
    DELETE FROM daily_tips WHERE date >= start_date AND date <= end_date;
    DELETE FROM daily_questions WHERE date >= start_date AND date <= end_date;
    
    -- Generate tips for each day
    current_tip_date := start_date;
    
    WHILE current_tip_date <= end_date LOOP
        -- Calculate which tip to use (cycle through the array)
        tip_index := (EXTRACT(DAY FROM current_tip_date)::integer - 1) % array_length(tips_data, 1) + 1;
        
        -- Insert daily tip
        INSERT INTO daily_tips (date, title, content, category)
        VALUES (
            current_tip_date,
            tips_data[tip_index][1],
            tips_data[tip_index][2], 
            tips_data[tip_index][3]
        );
        
        -- Calculate which question to use (cycle through the array)
        tip_index := (EXTRACT(DAY FROM current_tip_date)::integer - 1) % array_length(questions_data, 1) + 1;
        
        -- Insert daily question
        INSERT INTO daily_questions (date, question, option_a, option_b, option_c, correct_answer, explanation, category)
        VALUES (
            current_tip_date,
            (questions_data[tip_index]).f1,  -- question
            (questions_data[tip_index]).f2,  -- option_a
            (questions_data[tip_index]).f3,  -- option_b
            (questions_data[tip_index]).f4,  -- option_c
            (questions_data[tip_index]).f5,  -- correct_answer
            (questions_data[tip_index]).f6,  -- explanation
            (questions_data[tip_index]).f7   -- category
        );
        
        current_tip_date := current_tip_date + INTERVAL '1 day';
    END LOOP;
    
    RAISE NOTICE 'Daily tips and questions populated for % days from % to %', 
                 end_date - start_date + 1, start_date, end_date;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to populate tips
SELECT populate_daily_tips();

-- Create a trigger function to automatically add more tips when needed
CREATE OR REPLACE FUNCTION check_and_populate_future_tips()
RETURNS void AS $$
DECLARE
    max_date date;
    days_ahead integer;
BEGIN
    -- Check the maximum date we have tips for
    SELECT COALESCE(MAX(date), CURRENT_DATE - INTERVAL '1 day') INTO max_date FROM daily_tips;
    
    -- Calculate how many days ahead we have data for
    days_ahead := max_date - CURRENT_DATE;
    
    -- If we have less than 30 days of future tips, add more
    IF days_ahead < 30 THEN
        -- Delete old tips (older than 7 days) to keep the table clean
        DELETE FROM daily_tips WHERE date < CURRENT_DATE - INTERVAL '7 days';
        DELETE FROM daily_questions WHERE date < CURRENT_DATE - INTERVAL '7 days';
        
        -- Add tips for the next 365 days
        PERFORM populate_daily_tips();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a daily maintenance function that can be called by cron or scheduled tasks
CREATE OR REPLACE FUNCTION daily_tips_maintenance()
RETURNS void AS $$
BEGIN
    PERFORM check_and_populate_future_tips();
END;
$$ LANGUAGE plpgsql;