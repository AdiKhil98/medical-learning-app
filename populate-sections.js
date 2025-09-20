// Script to populate the sections table with basic medical content
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pavjavrijaihnwbydfrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdmphdnJpamFpaG53YnlkZnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDM4NjYsImV4cCI6MjA2MDcxOTg2Nn0.4VrlhzIdV6F8cypZlVuYwE61GspATdFcjh0ebViOHIs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function populateSections() {
  console.log('🔧 Populating sections table with medical content...');
  
  const medicalSections = [
    // Main Categories (Level 1)
    {
      slug: 'innere-medizin',
      title: 'Innere Medizin',
      description: 'Systematische Übersicht der internistischen Erkrankungen',
      type: 'folder',
      icon: 'Stethoscope',
      color: '#E2827F',
      display_order: 1,
      parent_slug: null
    },
    {
      slug: 'chirurgie',
      title: 'Chirurgie',
      description: 'Systematische Übersicht der chirurgischen Fachgebiete',
      type: 'folder',
      icon: 'Scissors',
      color: '#E5877E',
      display_order: 2,
      parent_slug: null
    },
    {
      slug: 'notfallmedizin',
      title: 'Notfallmedizin',
      description: 'Systematische Übersicht der notfallmedizinischen Versorgung',
      type: 'folder',
      icon: 'AlertTriangle',
      color: '#EF4444',
      display_order: 3,
      parent_slug: null
    },
    
    // Sub-Categories under Innere Medizin (Level 2)
    {
      slug: 'kardiologie',
      title: 'Kardiologie',
      description: 'Erkrankungen des Herz-Kreislauf-Systems',
      type: 'folder',
      icon: 'Heart',
      color: '#EF4444',
      display_order: 1,
      parent_slug: 'innere-medizin'
    },
    {
      slug: 'pneumologie',
      title: 'Pneumologie',
      description: 'Erkrankungen der Atemwege und Lunge',
      type: 'folder',
      icon: 'Lungs',
      color: '#22C55E',
      display_order: 2,
      parent_slug: 'innere-medizin'
    },
    {
      slug: 'gastroenterologie',
      title: 'Gastroenterologie',
      description: 'Erkrankungen des Magen-Darm-Trakts',
      type: 'folder',
      icon: 'Circle',
      color: '#E5877E',
      display_order: 3,
      parent_slug: 'innere-medizin'
    },
    
    // Sections under Kardiologie (Level 3)
    {
      slug: 'herzinsuffizienz',
      title: 'Herzinsuffizienz',
      description: 'Klinik, Diagnostik und Therapie der Herzinsuffizienz',
      type: 'folder',
      icon: 'Heart',
      color: '#EF4444',
      display_order: 1,
      parent_slug: 'kardiologie'
    },
    {
      slug: 'koronare-herzkrankheit',
      title: 'Koronare Herzkrankheit',
      description: 'KHK, Angina pectoris und Myokardinfarkt',
      type: 'folder',
      icon: 'Heart',
      color: '#DC2626',
      display_order: 2,
      parent_slug: 'kardiologie'
    },
    
    // Sample content with JSON (Level 4 - actual content)
    {
      slug: 'herzinsuffizienz-akut',
      title: 'Akute Herzinsuffizienz',
      description: 'Notfallmanagement der akuten Herzinsuffizienz',
      type: 'file-text',
      icon: 'Heart',
      color: '#EF4444',
      display_order: 1,
      parent_slug: 'herzinsuffizienz',
      content_improved: JSON.stringify([
        {
          type: 'overview',
          title: 'Definition',
          content: 'Die akute Herzinsuffizienz ist ein lebensbedrohlicher Notfall mit akuter Verschlechterung der kardialen Pumpfunktion.'
        },
        {
          type: 'definition',
          term: 'Pathophysiologie',
          definition: 'Verminderte Ejektionsfraktion führt zu Rückstau und verminderter Organperfusion.'
        },
        {
          type: 'list',
          title: 'Symptome',
          items: [
            'Dyspnoe und Orthopnoe',
            'Periphere Ödeme', 
            'Distendierte Halsvenen',
            'Tachykardie',
            'Kalte, feuchte Haut'
          ]
        },
        {
          type: 'clinical_pearl',
          title: 'Klinischer Tipp',
          content: 'BNP/NT-proBNP sind wichtige Biomarker zur Diagnose und Verlaufskontrolle der Herzinsuffizienz.'
        }
      ]),
      content_html: '<h2>Akute Herzinsuffizienz</h2><p>Notfallmäßige Behandlung erforderlich bei akuter Dekompensation der Herzleistung.</p>'
    }
  ];
  
  try {
    const { data, error } = await supabase
      .from('sections')
      .insert(medicalSections)
      .select();
    
    if (error) {
      console.error('❌ Error inserting sections:', error.message);
      return;
    }
    
    console.log('✅ Successfully populated sections table!');
    console.log(`📊 Inserted ${data?.length || 0} sections`);
    
    // Verify the data
    const { data: allSections, count } = await supabase
      .from('sections')
      .select('*', { count: 'exact' });
      
    console.log(`✅ Total sections in database: ${count}`);
    
    const { data: rootSections } = await supabase
      .from('sections')
      .select('title')
      .is('parent_slug', null);
      
    console.log('🌳 Root categories:', rootSections?.map(s => s.title).join(', '));
    
  } catch (e) {
    console.error('💥 Failed to populate sections:', e.message);
  }
}

populateSections();