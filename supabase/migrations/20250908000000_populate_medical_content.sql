-- Medical Content Population Migration
-- This addresses the blank pages issue by providing hierarchical medical content

-- Clear existing data (optional)
DELETE FROM sections WHERE true;

-- Insert main categories (Level 1)
INSERT INTO sections (slug, title, description, type, icon, color, display_order, parent_slug, category) VALUES
('innere-medizin', 'Innere Medizin', 'Systematische Übersicht der internistischen Erkrankungen', 'folder', 'Stethoscope', '#0077B6', 1, NULL, 'Innere Medizin'),
('chirurgie', 'Chirurgie', 'Systematische Übersicht der chirurgischen Fachgebiete', 'folder', 'Scissors', '#EF4444', 2, NULL, 'Chirurgie'),
('notfallmedizin', 'Notfallmedizin', 'Systematische Übersicht der notfallmedizinischen Versorgung', 'folder', 'AlertTriangle', '#F59E0B', 3, NULL, 'Notfallmedizin');

-- Insert subcategories (Level 2)
INSERT INTO sections (slug, title, description, type, icon, color, display_order, parent_slug, category) VALUES
-- Innere Medizin subcategories
('kardiologie', 'Kardiologie', 'Erkrankungen des Herzens und des Kreislaufsystems', 'folder', 'Heart', '#DC2626', 1, 'innere-medizin', 'Innere Medizin'),
('pneumologie', 'Pneumologie', 'Erkrankungen der Lunge und Atemwege', 'folder', 'Activity', '#0EA5E9', 2, 'innere-medizin', 'Innere Medizin'),
('gastroenterologie', 'Gastroenterologie', 'Erkrankungen des Verdauungstrakts', 'folder', 'Circle', '#EA580C', 3, 'innere-medizin', 'Innere Medizin'),
('nephrologie', 'Nephrologie', 'Nierenerkrankungen', 'folder', 'Droplets', '#0891B2', 4, 'innere-medizin', 'Innere Medizin'),

-- Chirurgie subcategories  
('allgemeinchirurgie', 'Allgemeinchirurgie', 'Grundlagen chirurgischer Eingriffe', 'folder', 'Scissors', '#DC2626', 1, 'chirurgie', 'Chirurgie'),
('traumatologie', 'Traumatologie', 'Unfallchirurgie und Verletzungen', 'folder', 'Shield', '#B91C1C', 2, 'chirurgie', 'Chirurgie'),
('viszeralchirurgie', 'Viszeralchirurgie', 'Chirurgie der Bauchorgane', 'folder', 'Scissors', '#DC2626', 3, 'chirurgie', 'Chirurgie'),

-- Notfallmedizin subcategories
('reanimation', 'Reanimation', 'Herz-Lungen-Wiederbelebung und Notfallversorgung', 'folder', 'Zap', '#DC2626', 1, 'notfallmedizin', 'Notfallmedizin'),
('akute-vergiftungen', 'Akute Vergiftungen', 'Toxikologie und Vergiftungsnotfälle', 'folder', 'AlertTriangle', '#B45309', 2, 'notfallmedizin', 'Notfallmedizin'),
('schockformen', 'Schockformen', 'Verschiedene Schockarten und deren Behandlung', 'folder', 'Activity', '#EF4444', 3, 'notfallmedizin', 'Notfallmedizin');

-- Insert content sections (Level 3) with actual medical content
INSERT INTO sections (slug, title, description, type, icon, color, display_order, parent_slug, category, content_html, content_details) VALUES

-- Kardiologie content
('herzinsuffizienz', 'Herzinsuffizienz', 'Chronische und akute Herzinsuffizienz', 'content', 'Heart', '#DC2626', 1, 'kardiologie', 'Innere Medizin',
'<h2>Herzinsuffizienz</h2>
<h3>Definition</h3>
<p>Die Herzinsuffizienz ist ein klinisches Syndrom, bei dem das Herz nicht in der Lage ist, das erforderliche Herzzeitvolumen bei normalem Füllungsdruck zu fördern.</p>

<h3>Klassifikation nach NYHA</h3>
<ul>
<li><strong>NYHA I:</strong> Keine Beschwerden bei normaler körperlicher Belastung</li>
<li><strong>NYHA II:</strong> Beschwerden bei stärkerer körperlicher Belastung</li>
<li><strong>NYHA III:</strong> Beschwerden bereits bei leichter Belastung</li>
<li><strong>NYHA IV:</strong> Beschwerden bereits in Ruhe</li>
</ul>

<h3>Therapie</h3>
<p><strong>Medikamentöse Therapie:</strong></p>
<ul>
<li>ACE-Hemmer oder AT1-Antagonisten</li>
<li>Beta-Blocker</li>
<li>Diuretika bei Flüssigkeitsretention</li>
<li>Aldosteronantagonisten</li>
</ul>

<h3>Prognose</h3>
<p>Abhängig von der Grunderkrankung und dem NYHA-Stadium. Frühe Diagnose und konsequente Therapie verbessern die Prognose erheblich.</p>',
'Herzinsuffizienz - chronisches Syndrom mit reduzierter Pumpfunktion des Herzens. NYHA-Klassifikation von I-IV.'),

('koronare-herzkrankheit', 'Koronare Herzkrankheit', 'Stenosen der Herzkranzgefäße', 'content', 'Heart', '#DC2626', 2, 'kardiologie', 'Innere Medizin',
'<h2>Koronare Herzkrankheit (KHK)</h2>
<h3>Definition</h3>
<p>Erkrankung der Herzkranzgefäße mit Stenosen durch arteriosklerotische Plaques, die zu einer Minderperfusion des Myokards führt.</p>

<h3>Risikofaktoren</h3>
<p><strong>Beeinflussbare Faktoren:</strong></p>
<ul>
<li>Diabetes mellitus</li>
<li>Arterielle Hypertonie</li>
<li>Hypercholesterinämie</li>
<li>Nikotinabusus</li>
<li>Adipositas</li>
</ul>

<p><strong>Nicht beeinflussbare Faktoren:</strong></p>
<ul>
<li>Alter</li>
<li>Geschlecht (männlich)</li>
<li>Positive Familienanamnese</li>
</ul>

<h3>Klinik</h3>
<ul>
<li>Angina pectoris</li>
<li>Belastungsdyspnoe</li>
<li>Herzrhythmusstörungen</li>
</ul>

<h3>Diagnostik</h3>
<ul>
<li>Ruhe-EKG</li>
<li>Belastungs-EKG</li>
<li>Echokardiographie</li>
<li>Herzkatheteruntersuchung</li>
</ul>',
'KHK - Stenosen der Koronararterien durch Arteriosklerose. Führt zu Angina pectoris und Myokardinfarkt.'),

-- Pneumologie content
('asthma-bronchiale', 'Asthma bronchiale', 'Chronische Atemwegserkrankung mit reversibler Obstruktion', 'content', 'Activity', '#0EA5E9', 1, 'pneumologie', 'Innere Medizin',
'<h2>Asthma bronchiale</h2>
<h3>Definition</h3>
<p>Chronische entzündliche Erkrankung der Atemwege mit reversibler Atemwegsobstruktion und bronchialer Hyperreagibilität.</p>

<h3>Pathophysiologie</h3>
<p>Entzündliche Reaktion führt zu:</p>
<ul>
<li>Bronchospasmus</li>
<li>Schleimhautödem</li>
<li>Vermehrte Schleimproduktion</li>
</ul>

<h3>Stufentherapie</h3>
<ul>
<li><strong>Stufe 1:</strong> Bedarfstherapie mit kurzwirksamem Beta-2-Agonist (SABA)</li>
<li><strong>Stufe 2:</strong> Niedrigdosierte inhalative Kortikosteroide (ICS)</li>
<li><strong>Stufe 3:</strong> ICS + langwirksamte Beta-2-Agonisten (LABA)</li>
<li><strong>Stufe 4:</strong> Hochdosierte ICS + LABA</li>
<li><strong>Stufe 5:</strong> Zusätzlich orale Kortikosteroide</li>
</ul>

<h3>Notfalltherapie</h3>
<p>Bei schwerem Asthmaanfall:</p>
<ul>
<li>O2-Gabe</li>
<li>SABA inhalativ</li>
<li>Systemische Kortikosteroide</li>
<li>Bei Therapieresistenz: Theophyllin, Magnesium</li>
</ul>',
'Asthma - chronische Atemwegsentzündung mit reversibler Obstruktion. Stufentherapie von SABA bis systemische Kortikosteroide.'),

('copd', 'COPD', 'Chronisch obstruktive Lungenerkrankung', 'content', 'Activity', '#0EA5E9', 2, 'pneumologie', 'Innere Medizin',
'<h2>COPD (Chronic Obstructive Pulmonary Disease)</h2>
<h3>Definition</h3>
<p>Chronische, progrediente und teilweise reversible Atemwegsverengung als Folge einer abnormalen Entzündungsreaktion auf Noxen.</p>

<h3>GOLD-Klassifikation</h3>
<ul>
<li><strong>GOLD 1 (leicht):</strong> FEV1 ≥ 80% Soll</li>
<li><strong>GOLD 2 (mittel):</strong> FEV1 50-79% Soll</li>
<li><strong>GOLD 3 (schwer):</strong> FEV1 30-49% Soll</li>
<li><strong>GOLD 4 (sehr schwer):</strong> FEV1 < 30% Soll</li>
</ul>

<h3>Therapie</h3>
<p><strong>Nicht-medikamentös:</strong></p>
<ul>
<li>Nikotinstopp (wichtigste Maßnahme!)</li>
<li>Pneumokokken- und Influenzaimpfung</li>
<li>Körperliches Training</li>
</ul>

<p><strong>Medikamentös:</strong></p>
<ul>
<li>Bronchodilatatoren (LABA, LAMA)</li>
<li>ICS bei häufigen Exazerbationen</li>
<li>Langzeit-O2-Therapie bei chronischer Hypoxämie</li>
</ul>',
'COPD - chronische obstruktive Lungenerkrankung. GOLD-Stadien 1-4. Wichtigste Therapie: Nikotinstopp.'),

-- Reanimation content
('basic-life-support', 'Basic Life Support', 'Grundlegende Reanimationsmaßnahmen', 'content', 'Zap', '#DC2626', 1, 'reanimation', 'Notfallmedizin',
'<h2>Basic Life Support (BLS)</h2>
<h3>Überlebenskette</h3>
<p>Die Überlebenskette besteht aus 4 Gliedern:</p>
<ol>
<li>Frühe Erkennung und Alarmierung</li>
<li>Frühe Herzdruckmassage</li>
<li>Frühe Defibrillation</li>
<li>Professionelle Hilfe</li>
</ol>

<h3>BLS-Algorithmus</h3>
<ol>
<li><strong>Bewusstsein prüfen:</strong> Ansprechen und Schmerzreiz</li>
<li><strong>Notruf absetzen:</strong> 112</li>
<li><strong>Atemwege freimachen:</strong> Kopf überstrecken, Kinn anheben</li>
<li><strong>Atmung kontrollieren:</strong> Sehen, Hören, Fühlen (max. 10 Sek.)</li>
<li><strong>Herzdruckmassage beginnen</strong></li>
</ol>

<h3>Herzdruckmassage</h3>
<ul>
<li><strong>Position:</strong> Unteres Drittel des Sternums</li>
<li><strong>Frequenz:</strong> 100-120 Kompressionen/min</li>
<li><strong>Tiefe:</strong> 5-6 cm</li>
<li><strong>Verhältnis:</strong> 30:2 (Kompressionen:Beatmungen)</li>
<li><strong>Entlastung:</strong> Vollständige Entlastung zwischen den Kompressionen</li>
</ul>

<h3>Besonderheiten</h3>
<ul>
<li>Bei Kindern: 15:2 Verhältnis bei 2 Helfern</li>
<li>Reanimation nicht unterbrechen bis professionelle Hilfe eintrifft</li>
<li>AED verwenden, sobald verfügbar</li>
</ul>',
'BLS - Grundlegende Reanimation bei Herz-Kreislauf-Stillstand. 30:2 Verhältnis, 100-120/min, 5-6cm Tiefe.'),

('advanced-life-support', 'Advanced Life Support', 'Erweiterte Reanimationsmaßnahmen', 'content', 'Zap', '#DC2626', 2, 'reanimation', 'Notfallmedizin',
'<h2>Advanced Life Support (ALS)</h2>
<h3>ALS-Algorithmus</h3>
<p>Erweiterte Maßnahmen bei Herz-Kreislauf-Stillstand durch professionelle Helfer.</p>

<h3>Medikamente</h3>
<ul>
<li><strong>Adrenalin:</strong> 1mg i.v. alle 3-5 min</li>
<li><strong>Amiodaron:</strong> 300mg i.v. bei therapierefraktärem VF/VT</li>
<li><strong>Atropin:</strong> Nicht mehr empfohlen</li>
</ul>

<h3>Atemwegsmanagement</h3>
<ul>
<li>Larynxmaske oder Endotrachealer Tubus</li>
<li>Ventilation mit 100% Sauerstoff</li>
<li>Kapnographie zur Kontrolle</li>
</ul>

<h3>Reversible Ursachen (4 H + 4 T)</h3>
<p><strong>4 H:</strong></p>
<ul>
<li>Hypoxie</li>
<li>Hypovolämie</li>
<li>Hypo-/Hyperkaliämie</li>
<li>Hypothermie</li>
</ul>

<p><strong>4 T:</strong></p>
<ul>
<li>Thrombose (Lungenembolie/Koronar)</li>
<li>Tamponade (Perikard)</li>
<li>Tension-Pneumothorax</li>
<li>Toxine</li>
</ul>',
'ALS - Erweiterte Reanimation mit Medikamenten und Atemwegsmanagement. 4H + 4T als reversible Ursachen.');

-- Add some empty sections to test empty state handling
INSERT INTO sections (slug, title, description, type, icon, color, display_order, parent_slug, category) VALUES
('infektiologie', 'Infektiologie', 'Infektionskrankheiten und Antibiotikatherapie', 'folder', 'Shield', '#10B981', 5, 'innere-medizin', 'Innere Medizin'),
('endokrinologie', 'Endokrinologie', 'Hormonelle Erkrankungen und Stoffwechsel', 'folder', 'Circle', '#E2827F', 6, 'innere-medizin', 'Innere Medizin');