import { createClient } from '@supabase/supabase-js';
import { setTimeout } from 'timers/promises';

const supabaseUrl = 'https://pavjavrijaihnwbydfrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdmphdnJpamFpaG53YnlkZnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDM4NjYsImV4cCI6MjA2MDcxOTg2Nn0.4VrlhzIdV6F8cypZlVuYwE61GspATdFcjh0ebViOHIs';

// Try with service role key if available (more permissions)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey || supabaseAnonKey);

// Medical content transformation functions
function detectMedicalSections(text) {
  const sections = [];
  
  // Split content by paragraphs and analyze
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 10);
  
  const sectionPatterns = [
    {
      keywords: ['definition', 'klassifikation', 'begriff', 'ist eine', 'wird definiert'],
      type: 'definition',
      title: 'Definition und Klassifikation',
      icon: '📋'
    },
    {
      keywords: ['epidemiologie', 'häufigkeit', 'verteilung', 'prävalenz', 'inzidenz', 'prozent', 'beträgt'],
      type: 'epidemiology', 
      title: 'Epidemiologie',
      icon: '📊'
    },
    {
      keywords: ['ätiologie', 'ursache', 'pathophysiologie', 'entstehung', 'verursacht'],
      type: 'etiology',
      title: 'Ätiologie und Pathophysiologie', 
      icon: '🔬'
    },
    {
      keywords: ['symptom', 'klinik', 'beschwerden', 'zeichen', 'manifestiert'],
      type: 'symptoms',
      title: 'Klinische Symptomatik',
      icon: '🩺' 
    },
    {
      keywords: ['diagnostik', 'untersuchung', 'befund', 'labor', 'diagnose'],
      type: 'diagnosis',
      title: 'Diagnostik',
      icon: '🔍'
    },
    {
      keywords: ['therapie', 'behandlung', 'medikament', 'intervention'],
      type: 'therapy',
      title: 'Therapie',
      icon: '💊'
    },
    {
      keywords: ['prognose', 'verlauf', 'heilung', 'outcome'],
      type: 'prognosis',
      title: 'Prognose und Verlauf', 
      icon: '📈'
    },
    {
      keywords: ['alarm', 'notfall', 'komplikation', 'kritisch', 'lebensbedrohlich'],
      type: 'emergency',
      title: 'Alarmsymptome',
      icon: '🚨'
    }
  ];
  
  paragraphs.forEach((paragraph, index) => {
    const lowerText = paragraph.toLowerCase();
    let matchedSection = null;
    
    // Try to match with section patterns
    for (const pattern of sectionPatterns) {
      if (pattern.keywords.some(keyword => lowerText.includes(keyword))) {
        matchedSection = pattern;
        break;
      }
    }
    
    // If no match, create a general section
    if (!matchedSection) {
      matchedSection = {
        type: 'general',
        title: `Abschnitt ${sections.length + 1}`,
        icon: '📄'
      };
    }
    
    sections.push({
      ...matchedSection,
      content: paragraph.trim(),
      order: index
    });
  });
  
  return sections;
}

function enhanceTextWithMedicalFormatting(text) {
  let enhanced = text;
  
  // Enhance numbers with badges
  enhanced = enhanced.replace(/(\d+[.,]?\d*)\s*(%|prozent|mg\/dl|mmol\/l|ms|stunden|tage|jahre)/gi, 
    '<span class="number">$1$2</span>');
  
  // Enhance medical terms
  const medicalTerms = [
    'AV-Block', 'ICD-10', 'KDIGO', 'QRS-Komplex', 'PQ-Zeit', 'EKG', 'Mobitz', 'Wenckebach',
    'Schrittmacher', 'Bradykardie', 'Asystolie', 'Herzrhythmus', 'Vorhof', 'Ventrikel',
    'Myokard', 'Koronar', 'Stenose', 'Infarkt', 'Ischämie', 'Hypertonie', 'Hypotonie'
  ];
  
  medicalTerms.forEach(term => {
    const regex = new RegExp(`\\b(${term})\\b`, 'gi');
    enhanced = enhanced.replace(regex, '<span class="medical-term">$1</span>');
  });
  
  // Enhance classifications
  enhanced = enhanced.replace(/(ICD-10\s+unter\s+[A-Z]\d+[.\d]*)/gi,
    '<span class="classification">$1</span>');
    
  // Enhance critical terms
  const criticalTerms = ['lebensbedrohlich', 'kritisch', 'sofort', 'umgehend', 'notfall'];
  criticalTerms.forEach(term => {
    const regex = new RegExp(`\\b(${term}\\w*)\\b`, 'gi');
    enhanced = enhanced.replace(regex, '<span class="critical">$1</span>');
  });
  
  return enhanced;
}

function generateEnhancedHTML(title, sections) {
  const sectionCards = sections.map(section => `
    <div class="section-card">
      <h2 class="section-title">
        <span class="section-icon">${section.icon}</span>
        ${section.title}
      </h2>
      <div class="content-text">
        <p>${enhanceTextWithMedicalFormatting(section.content)}</p>
      </div>
    </div>
  `).join('\n');
  
  return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - MedMeister</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%);
            color: #2c3e50;
            line-height: 1.6;
        }
        
        .content-wrapper {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .content-header {
            background: linear-gradient(135deg, #66BB6A 0%, #81C784 100%);
            color: white;
            padding: 40px;
            border-radius: 20px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(76, 175, 80, 0.2);
        }
        
        .content-header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .content-header .subtitle {
            font-size: 1.1rem;
            opacity: 0.95;
        }
        
        .section-card {
            background: white;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 25px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            border-left: 5px solid #66BB6A;
            transition: all 0.3s ease;
        }
        
        .section-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        
        .section-title {
            font-size: 1.5rem;
            color: #2c3e50;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e8f5e9;
        }
        
        .section-icon {
            font-size: 1.8rem;
        }
        
        .content-text {
            color: #4a5568;
            line-height: 1.8;
        }
        
        .content-text p {
            margin-bottom: 18px;
            text-align: justify;
        }
        
        /* Highlighting styles */
        .number {
            background: #E2827F;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.9em;
            display: inline-block;
            margin: 0 2px;
        }
        
        .medical-term {
            color: #9C27B0;
            font-weight: 600;
            border-bottom: 2px dotted #9C27B0;
            cursor: help;
        }
        
        .classification {
            background: linear-gradient(45deg, #4834d4, #686de0);
            color: white;
            padding: 3px 10px;
            border-radius: 15px;
            font-weight: 600;
            display: inline-block;
        }
        
        .critical {
            background: #f44336;
            color: white;
            padding: 4px 10px;
            border-radius: 8px;
            font-weight: bold;
            display: inline-block;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }
        
        @media (max-width: 768px) {
            .content-wrapper { padding: 10px; }
            .content-header { padding: 25px; }
            .section-card { padding: 20px; }
            .content-header h1 { font-size: 1.8rem; }
        }
    </style>
</head>
<body>
    <div class="content-wrapper">
        <!-- Header -->
        <div class="content-header">
            <h1>
                <span>🏥</span>
                ${title}
            </h1>
            <p class="subtitle">Vollständiger medizinischer Leitfaden für Kenntnissprüfung und Fachsprachprüfung</p>
        </div>
        
        ${sectionCards}
    </div>
</body>
</html>`;
}

async function transformAllMedicalContent() {
  console.log('🏥 Starting transformation of ALL medical content...\n');
  
  try {
    // Fetch all sections with any content
    console.log('📋 Fetching all medical sections...');
    const { data: allSections, error: fetchError } = await supabase
      .from('sections')
      .select('id, slug, title, content_details, content_improved, content_html, type')
      .not('content_details', 'is', null)
      .limit(100);
    
    if (fetchError) {
      console.error('❌ Error fetching sections:', fetchError);
      return;
    }
    
    if (!allSections || allSections.length === 0) {
      console.log('⚠️ No sections with content found');
      
      // Let's try without the filter to see what's available
      const { data: anySections } = await supabase
        .from('sections')
        .select('id, slug, title, content_details, content_improved, content_html')
        .limit(10);
      
      console.log('Available sections:', anySections?.map(s => ({
        slug: s.slug,
        title: s.title,
        hasContentDetails: !!s.content_details,
        hasContentImproved: !!s.content_improved,
        hasContentHTML: !!s.content_html
      })));
      return;
    }
    
    console.log(`✅ Found ${allSections.length} sections to transform\n`);
    
    let transformedCount = 0;
    let errorCount = 0;
    
    for (const section of allSections) {
      try {
        console.log(`🔄 Processing: ${section.title} (${section.slug})`);
        
        // Skip if already has enhanced content
        if (section.content_html && section.content_html.includes('section-card')) {
          console.log('  ⏭️ Already enhanced, skipping');
          continue;
        }
        
        // Get content to transform
        const contentToTransform = section.content_details || 'Medizinischer Inhalt verfügbar.';
        
        // Detect and structure medical sections
        const medicalSections = detectMedicalSections(contentToTransform);
        console.log(`  📊 Detected ${medicalSections.length} medical sections`);
        
        // Generate enhanced HTML
        const enhancedHTML = generateEnhancedHTML(section.title, medicalSections);
        
        // Create structured JSON for the enhanced content
        const enhancedJSON = medicalSections.map((sec, index) => ({
          type: sec.type,
          title: sec.title,
          content: sec.content,
          order: index
        }));
        
        // Update the section in database
        const { error: updateError } = await supabase
          .from('sections')
          .update({
            content_html: enhancedHTML,
            content_improved: enhancedJSON
          })
          .eq('id', section.id);
        
        if (updateError) {
          console.error(`  ❌ Failed to update ${section.slug}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`  ✅ Successfully enhanced ${section.slug}`);
          transformedCount++;
        }
        
        // Small delay to avoid rate limiting
        await setTimeout(100);
        
      } catch (sectionError) {
        console.error(`  ❌ Error processing ${section.slug}:`, sectionError.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Transformation Complete!');
    console.log(`✅ Successfully transformed: ${transformedCount} sections`);
    console.log(`❌ Errors encountered: ${errorCount} sections`);
    console.log('\n📱 All medical content now has enhanced formatting with:');
    console.log('   - Medical term highlighting');
    console.log('   - Number badges');
    console.log('   - Section structure');
    console.log('   - Interactive elements');
    console.log('   - Professional medical styling');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the transformation
transformAllMedicalContent();