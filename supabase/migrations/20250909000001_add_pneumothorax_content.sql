-- Add pneumothorax content to the medical learning database
-- This fills in missing content that users are trying to access

-- Insert pneumothorax content into sections table
INSERT INTO sections (
  slug, 
  title, 
  description, 
  type, 
  icon, 
  color, 
  display_order, 
  parent_section, 
  category,
  content_improved,
  content_html
) VALUES (
  'pneumothorax',
  'Pneumothorax',
  'Medizinischer Notfall mit Luftansammlung im Pleuraspalt',
  'content',
  '🫁',
  '#DC2626',
  1,
  'pneumologie',
  'Notfallmedizin',
  'Ein Pneumothorax ist eine Luftansammlung im Pleuraspalt, die zu einem teilweisen oder vollständigen Kollaps der Lunge führt.

Definition:
Luftansammlung zwischen Lunge und Brustwand im Pleuraspalt

Arten:
• Spontanpneumothorax: Ohne erkennbare Ursache
• Traumatischer Pneumothorax: Nach Verletzung
• Spannungspneumothorax: Lebensbedrohlicher Notfall

Symptome:
• Plötzliche Atemnot
• Stechende Brustschmerzen
• Trockener Husten
• Zyanose bei schweren Fällen

Diagnose:
• Klinische Untersuchung
• Röntgen Thorax
• CT bei unklaren Fällen

Behandlung:
• Spontanpneumothorax <20%: Überwachung
• >20% oder Symptome: Drainage
• Spannungspneumothorax: Sofortige Entlastung

Notfallbehandlung:
1. Sauerstoffgabe
2. Venöser Zugang
3. Bei Spannungspneumothorax: Sofortige Nadeldekompression
4. Thoraxdrainage anlegen',
  create_enhanced_medical_html(
    'Ein Pneumothorax ist eine Luftansammlung im Pleuraspalt, die zu einem teilweisen oder vollständigen Kollaps der Lunge führt.

Definition:
Luftansammlung zwischen Lunge und Brustwand im Pleuraspalt

Arten:
• Spontanpneumothorax: Ohne erkennbare Ursache
• Traumatischer Pneumothorax: Nach Verletzung  
• Spannungspneumothorax: Lebensbedrohlicher Notfall

Symptome:
• Plötzliche Atemnot
• Stechende Brustschmerzen
• Trockener Husten
• Zyanose bei schweren Fällen

Diagnose:
• Klinische Untersuchung
• Röntgen Thorax
• CT bei unklaren Fällen

Behandlung:
• Spontanpneumothorax <20%: Überwachung
• >20% oder Symptome: Drainage
• Spannungspneumothorax: Sofortige Entlastung

Notfallbehandlung:
1. Sauerstoffgabe
2. Venöser Zugang
3. Bei Spannungspneumothorax: Sofortige Nadeldekompression
4. Thoraxdrainage anlegen',
    'Pneumothorax',
    'Notfallmedizin'
  )
);