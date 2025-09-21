import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pavjavrijaihnwbydfrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdmphdnJpamFpaG53YnlkZnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDM4NjYsImV4cCI6MjA2MDcxOTg2Nn0.4VrlhzIdV6F8cypZlVuYwE61GspATdFcjh0ebViOHIs';

// Try with service role key if available (more permissions)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey || supabaseAnonKey);

const sampleMedicalContent = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <style>
        .section-card { background: white; border-radius: 16px; padding: 30px; margin-bottom: 25px; }
        .section-title { font-size: 1.5rem; color: #2c3e50; margin-bottom: 20px; }
        .content-text { color: #4a5568; line-height: 1.8; }
        .number { background: #E2827F; color: white; padding: 2px 8px; border-radius: 12px; }
        .medical-term { color: #9C27B0; font-weight: 600; }
    </style>
</head>
<body>
    <div class="section-card">
        <h2 class="section-title">
            <span class="section-icon">💓</span>
            Definition und Klassifikation
        </h2>
        <div class="content-text">
            <p>Der <span class="medical-term">AV-Block</span> ist eine Störung der Erregungsleitung zwischen Vorhof und Ventrikel im Herzen, die nach <span class="classification">ICD-10 unter I44.0-I44.3</span> klassifiziert wird.</p>
            <p>Grad I zeigt eine verlängerte PQ-Zeit über <span class="number">200 ms</span> ohne Blockierung der Überleitung.</p>
        </div>
    </div>
    <div class="section-card">
        <h2 class="section-title">
            <span class="section-icon">📊</span>
            Epidemiologie  
        </h2>
        <div class="content-text">
            <p>Die Prävalenz des AV-Blocks steigt mit dem Alter und beträgt bei über 65-Jährigen etwa <span class="number">1-3 Prozent</span> in Deutschland.</p>
        </div>
    </div>
</body>
</html>`;

const jsonContent = [
  {
    type: "definition",
    title: "Definition und Klassifikation", 
    content: "Der AV-Block ist eine Störung der Erregungsleitung zwischen Vorhof und Ventrikel im Herzen, die nach ICD-10 unter I44.0-I44.3 klassifiziert wird. Grad I zeigt eine verlängerte PQ-Zeit über 200 ms ohne Blockierung der Überleitung. Grad II Typ 1 (Mobitz I oder Wenckebach) ist durch eine progressive Verlängerung der PQ-Zeit charakterisiert, bis ein QRS-Komplex ausfällt."
  },
  {
    type: "epidemiology",
    title: "Epidemiologie",
    content: "Die epidemiologische Verteilung zeigt: Die Prävalenz des AV-Blocks steigt mit dem Alter und beträgt bei über 65-Jährigen etwa 1-3 Prozent in Deutschland. Der AV-Block I tritt bei etwa 5 Prozent der gesunden Erwachsenen auf, während höhergradige AV-Blöcke seltener sind."
  },
  {
    type: "etiology", 
    title: "Ätiologie und Pathophysiologie",
    content: "Die Ursachen umfassen degenerative Veränderungen des Reizleitungssystems, koronare Herzkrankheit, Myokarditis, und medikamentöse Einflüsse durch Betablocker oder Kalziumkanalblocker."
  }
];

async function createTestContent() {
  console.log('🏥 Creating test medical content for AV-Block...\n');
  
  try {
    // First try to update existing AV-Block
    const { data: existing, error: findError } = await supabase
      .from('sections')
      .select('id, slug, title')
      .ilike('slug', '%av-block%')
      .limit(5);
    
    if (findError) {
      console.log('⚠️ Could not search existing (possibly due to RLS):', findError.message);
    }
    
    console.log('Found existing sections:', existing);
    
    if (existing && existing.length > 0) {
      const targetSection = existing[0];
      console.log('📝 Updating existing section:', targetSection.slug);
      
      const { data: updated, error: updateError } = await supabase
        .from('sections')
        .update({
          content_html: sampleMedicalContent,
          content_improved: jsonContent,
          description: 'Enhanced medical content with proper rendering'
        })
        .eq('id', targetSection.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Update failed:', updateError);
        console.log('💡 This might be due to RLS policies or permissions');
      } else {
        console.log('✅ Successfully updated section:', updated.slug);
      }
    } else {
      console.log('📋 No existing AV-Block found, checking table access...');
      
      // Try to get table info
      const { data: tableCheck, error: tableError } = await supabase
        .from('sections')
        .select('slug, title')
        .limit(1);
        
      if (tableError) {
        console.error('❌ Cannot access sections table:', tableError);
        console.log('💡 Possible issues:');
        console.log('   - Row Level Security (RLS) blocking access');
        console.log('   - User not authenticated');
        console.log('   - Table permissions');
      } else if (tableCheck && tableCheck.length > 0) {
        console.log('✅ Table accessible, found section:', tableCheck[0].slug);
        console.log('💡 The AV-Block section might not exist yet');
      } else {
        console.log('⚠️ Table accessible but empty');
      }
    }
    
    console.log('\n🔧 To test the MedicalContentRenderer:');
    console.log('1. Access the admin panel to add content with content_html field');
    console.log('2. Or temporarily disable RLS on sections table');
    console.log('3. Or add content through the app\'s admin interface');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

createTestContent();