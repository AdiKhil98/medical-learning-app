-- Fix daily tips by adding tips for current dates
-- This script adds daily tips for today and the next few days

-- First, let's clear any existing tips to avoid duplicates
DELETE FROM daily_tips WHERE date >= CURRENT_DATE AND date <= CURRENT_DATE + INTERVAL '7 days';
DELETE FROM daily_questions WHERE date >= CURRENT_DATE AND date <= CURRENT_DATE + INTERVAL '7 days';

-- Add fresh daily tips for current week
INSERT INTO daily_tips (date, title, content, category) VALUES
(CURRENT_DATE, 'EKG-Grundlagen', 'Die P-Welle repräsentiert die Vorhofaktivierung und sollte in Ableitung II bei Sinusrhythmus immer positiv sein. Eine fehlende P-Welle kann auf Vorhofflimmern hindeuten.', 'Kardiologie'),
(CURRENT_DATE + INTERVAL '1 day', 'Blutdruckmessung', 'Für eine korrekte Blutdruckmessung sollte der Patient 5 Minuten ruhig sitzen, die Manschette sollte 80% des Oberarmumfangs bedecken und auf Herzhöhe positioniert sein.', 'Innere Medizin'),
(CURRENT_DATE + INTERVAL '2 days', 'Auskultation', 'Bei der Herzauskultation sollten Sie systematisch alle vier Klappenpunkte abhören: Aortenklappe (2. ICR rechts), Pulmonalklappe (2. ICR links), Trikuspidalklappe (4. ICR links) und Mitralklappe (5. ICR links).', 'Kardiologie'),
(CURRENT_DATE + INTERVAL '3 days', 'Medikamentenwechselwirkungen', 'Marcumar (Warfarin) interagiert mit vielen Medikamenten. Besonders Antibiotika können die Wirkung verstärken. Regelmäßige INR-Kontrollen sind essentiell.', 'Pharmakologie'),
(CURRENT_DATE + INTERVAL '4 days', 'Diabetes-Management', 'Bei Typ-2-Diabetes sollte der HbA1c-Wert idealerweise unter 7% liegen. Metformin ist meist die erste Wahl der medikamentösen Therapie.', 'Endokrinologie'),
(CURRENT_DATE + INTERVAL '5 days', 'Notfall: Anaphylaxie', 'Bei Anaphylaxie ist Adrenalin das Mittel der ersten Wahl. 0,3-0,5mg i.m. in den Oberschenkel, kann nach 5-15 Minuten wiederholt werden.', 'Notfallmedizin'),
(CURRENT_DATE + INTERVAL '6 days', 'Laborwerte', 'Erhöhte Troponin-Werte sind hochspezifisch für Myokardschäden. Bereits geringe Erhöhungen können klinisch relevant sein.', 'Labormedizin');

-- Add fresh daily questions for current week  
INSERT INTO daily_questions (date, question, option_a, option_b, option_c, correct_answer, explanation, category) VALUES
(CURRENT_DATE, 'Welche Herzfrequenz gilt als normale Ruheherzfrequenz bei Erwachsenen?', '40-60 Schläge/min', '60-100 Schläge/min', '100-120 Schläge/min', 'B', 'Die normale Ruheherzfrequenz bei Erwachsenen liegt zwischen 60-100 Schlägen pro Minute. Werte unter 60 werden als Bradykardie, Werte über 100 als Tachykardie bezeichnet.', 'Kardiologie'),
(CURRENT_DATE + INTERVAL '1 day', 'Was ist der normale Blutdruckwert für Erwachsene?', 'Systolisch <120 mmHg, Diastolisch <80 mmHg', 'Systolisch <140 mmHg, Diastolisch <90 mmHg', 'Systolisch <160 mmHg, Diastolisch <100 mmHg', 'A', 'Optimaler Blutdruck liegt bei systolisch <120 mmHg und diastolisch <80 mmHg. Werte ab 140/90 mmHg gelten als Hypertonie.', 'Innere Medizin'),
(CURRENT_DATE + INTERVAL '2 days', 'Welches EKG-Zeichen ist typisch für einen Myokardinfarkt?', 'Verlängerte QT-Zeit', 'ST-Hebung', 'Verbreiterte P-Welle', 'B', 'ST-Hebungen sind ein klassisches Zeichen für einen akuten Myokardinfarkt (STEMI) und erfordern sofortige Reperfusionstherapie.', 'Kardiologie'),
(CURRENT_DATE + INTERVAL '3 days', 'Welcher HbA1c-Wert ist das Therapieziel bei Diabetes mellitus Typ 2?', '<6%', '<7%', '<8%', 'B', 'Das allgemeine Therapieziel für HbA1c bei Typ-2-Diabetes liegt unter 7%. Individuelle Anpassungen sind je nach Patient möglich.', 'Endokrinologie'),
(CURRENT_DATE + INTERVAL '4 days', 'Was ist die Erstbehandlung bei Anaphylaxie?', 'Antihistaminika i.v.', 'Adrenalin i.m.', 'Kortison i.v.', 'B', 'Adrenalin intramuskulär (0,3-0,5mg) ist die Erstbehandlung der Wahl bei Anaphylaxie. Es sollte sofort gegeben werden.', 'Notfallmedizin'),
(CURRENT_DATE + INTERVAL '5 days', 'Welcher Laborwert ist spezifisch für Myokardschäden?', 'CK-MB', 'Troponin', 'LDH', 'B', 'Troponin ist der spezifischste Marker für Myokardschäden und ist auch bei geringen Herzmuskelschäden nachweisbar.', 'Labormedizin'),
(CURRENT_DATE + INTERVAL '6 days', 'Welche Medikamentengruppe ist Mittel der ersten Wahl bei Typ-2-Diabetes?', 'Sulfonylharnstoffe', 'Metformin', 'Insulin', 'B', 'Metformin ist das Medikament der ersten Wahl bei Typ-2-Diabetes, da es effektiv den Blutzucker senkt und ein günstiges Nebenwirkungsprofil hat.', 'Endokrinologie');