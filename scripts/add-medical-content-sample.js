import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pavjavrijaihnwbydfrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdmphdnJpamFpaG53YnlkZnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDM4NjYsImV4cCI6MjA2MDcxOTg2Nn0.4VrlhzIdV6F8cypZlVuYwE61GspATdFcjh0ebViOHIs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sample HTML content based on your example
const sampleHTMLContent = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Akute Nierenschädigung - MedMeister</title>
    <style>
        .section-card { background: white; border-radius: 16px; padding: 30px; margin-bottom: 25px; }
        .section-title { font-size: 1.5rem; color: #2c3e50; margin-bottom: 20px; }
        .content-text { color: #4a5568; line-height: 1.8; }
        .number { background: #E2827F; color: white; padding: 2px 8px; border-radius: 12px; }
        .medical-term { color: #9C27B0; font-weight: 600; }
        .classification { background: linear-gradient(45deg, #4834d4, #686de0); color: white; padding: 3px 10px; border-radius: 15px; }
    </style>
</head>
<body>
    <div class="content-wrapper">
        <div class="section-card">
            <h2 class="section-title">
                <span class="section-icon">📋</span>
                Definition und Klassifikation
            </h2>
            <div class="content-text">
                <p>Die akute Nierenschädigung (AKI, acute kidney injury) ist definiert als ein plötzlicher Verlust der Nierenfunktion innerhalb von Stunden bis Tagen, die nach <span class="classification">ICD-10 unter N17</span> klassifiziert wird.</p>
                
                <p>Nach den <span class="medical-term">KDIGO-Kriterien</span> liegt eine AKI vor, wenn:</p>
                <ul>
                    <li>Serumkreatininwert innerhalb von <span class="number">48 Stunden</span> um mindestens <span class="number">0,3 mg/dl</span> ansteigt</li>
                    <li>Innerhalb von <span class="number">7 Tagen</span> auf das 1,5-fache des Ausgangswerts ansteigt</li>
                    <li>Urinausscheidung unter <span class="number">0,5 ml/kg KG/h</span> über 6 Stunden fällt</li>
                </ul>
            </div>
        </div>
        
        <div class="section-card">
            <h2 class="section-title">
                <span class="section-icon">📊</span>
                Epidemiologie
            </h2>
            <div class="content-text">
                <p>Die akute Nierenschädigung betrifft <span class="number">10-15%</span> aller hospitalisierten Patienten in Deutschland, wobei die Inzidenz auf Intensivstationen auf <span class="number">50-60%</span> ansteigt.</p>
                
                <p>Die Mortalität liegt bei <span class="medical-term">AKI-Stadium 1</span> bei <span class="number">10-15%</span>, steigt bei Stadium 2 auf <span class="number">20-25%</span> und erreicht bei Stadium 3 mit Dialysepflichtigkeit <span class="number">30-50%</span>.</p>
            </div>
        </div>
        
        <div class="section-card">
            <h2 class="section-title">
                <span class="section-icon">🚨</span>
                Alarmsymptome
            </h2>
            <div class="content-text">
                <p><strong>Lebensbedrohliche Komplikationen erfordern sofortige Intervention:</strong></p>
                
                <p><span class="critical">Hyperkaliämie</span> über <span class="number">6,5 mmol/l</span> mit EKG-Veränderungen wie verbreiterten QRS-Komplexen oder Herzrhythmusstörungen erfordert umgehende Therapie mit Kalziumglukonat und Insulin-Glukose.</p>
                
                <p><span class="critical">Lungenödem</span> mit Dyspnoe und Orthopnoe benötigt sofortige Diuretikagabe oder Nierenersatztherapie.</p>
            </div>
        </div>
    </div>
</body>
</html>`;

// Sample JSON content structure
const sampleJSONContent = [
  {
    type: "definition",
    title: "Definition und Klassifikation",
    content: "Die akute Nierenschädigung (AKI, acute kidney injury) ist definiert als ein plötzlicher Verlust der Nierenfunktion innerhalb von Stunden bis Tagen, die nach ICD-10 unter N17 klassifiziert wird. Nach den KDIGO-Kriterien liegt eine AKI vor, wenn: Serumkreatininwert innerhalb von 48 Stunden um mindestens 0,3 mg/dl ansteigt, innerhalb von 7 Tagen auf das 1,5-fache des Ausgangswerts ansteigt, oder Urinausscheidung unter 0,5 ml/kg KG/h über 6 Stunden fällt."
  },
  {
    type: "epidemiology",
    title: "Epidemiologie",
    content: "Die akute Nierenschädigung betrifft 10-15% aller hospitalisierten Patienten in Deutschland, wobei die Inzidenz auf Intensivstationen auf 50-60% ansteigt. Die Mortalität liegt bei AKI-Stadium 1 bei 10-15%, steigt bei Stadium 2 auf 20-25% und erreicht bei Stadium 3 mit Dialysepflichtigkeit 30-50%."
  },
  {
    type: "emergency",
    title: "Alarmsymptome",
    content: "Lebensbedrohliche Komplikationen erfordern sofortige Intervention: Hyperkaliämie über 6,5 mmol/l mit EKG-Veränderungen, Lungenödem mit Dyspnoe und Orthopnoe, schwere metabolische Azidose mit pH unter 7,1, urämische Enzephalopathie mit Bewusstseinstrübung."
  }
];

async function addSampleMedicalContent() {
  console.log('Adding sample medical content...');
  
  try {
    // First, let's check if we have a suitable section to update
    const { data: sections, error: fetchError } = await supabase
      .from('sections')
      .select('*')
      .limit(5);
    
    if (fetchError) {
      console.error('Error fetching sections:', fetchError);
      return;
    }
    
    console.log('Found sections:', sections?.map(s => ({ slug: s.slug, title: s.title })));
    
    if (!sections || sections.length === 0) {
      // Create a sample section if none exist
      const { data: newSection, error: insertError } = await supabase
        .from('sections')
        .insert([{
          slug: 'akute-nierenschadigung',
          title: 'Akute Nierenschädigung (AKI)',
          parent_slug: null,
          description: 'Vollständiger Leitfaden für Kenntnissprüfung und Fachsprachprüfung',
          type: 'document',
          display_order: 1,
          content_html: sampleHTMLContent,
          content_improved: sampleJSONContent
        }])
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating section:', insertError);
        return;
      }
      
      console.log('Created new section:', newSection);
    } else {
      // Update an existing section
      const targetSection = sections[0];
      console.log('Updating section:', targetSection.slug);
      
      const { data: updatedSection, error: updateError } = await supabase
        .from('sections')
        .update({
          content_html: sampleHTMLContent,
          content_improved: sampleJSONContent
        })
        .eq('id', targetSection.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating section:', updateError);
        return;
      }
      
      console.log('Updated section successfully:', updatedSection.slug);
    }
    
    console.log('✅ Sample medical content added successfully!');
    console.log('📋 Content includes:');
    console.log('   - Rich HTML content with medical styling');
    console.log('   - Structured JSON content for mobile rendering');
    console.log('   - Medical terms, classifications, and number highlights');
    console.log('   - Emergency/alarm symptoms section');
    
  } catch (error) {
    console.error('❌ Error adding sample content:', error);
  }
}

// Run the script
addSampleMedicalContent();