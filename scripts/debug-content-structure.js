import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pavjavrijaihnwbydfrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdmphdnJpamFpaG53YnlkZnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDM4NjYsImV4cCI6MjA2MDcxOTg2Nn0.4VrlhzIdV6F8cypZlVuYwE61GspATdFcjh0ebViOHIs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugContentStructure() {
  console.log('🔍 Debugging content structure...\n');
  
  try {
    // First, check all available sections
    const { data: allSections, error: allError } = await supabase
      .from('sections')
      .select('slug, title, type, content_improved, content_html, content_details')
      .limit(10);
    
    if (allError) {
      console.error('❌ Error fetching sections:', allError);
      return;
    }
    
    console.log('📋 Available sections:');
    allSections?.forEach(section => {
      console.log(`  - ${section.slug} (${section.title})`);
      console.log(`    Type: ${section.type}`);
      console.log(`    Has content_html: ${!!section.content_html}`);
      console.log(`    Has content_improved: ${!!section.content_improved}`);
      console.log(`    Has content_details: ${!!section.content_details}`);
      
      if (section.content_improved) {
        console.log(`    content_improved type: ${typeof section.content_improved}`);
        if (Array.isArray(section.content_improved)) {
          console.log(`    content_improved length: ${section.content_improved.length}`);
        }
      }
      console.log('');
    });
    
    // Check specifically for AV-Block
    const { data: avBlock, error: avError } = await supabase
      .from('sections')
      .select('*')
      .eq('slug', 'av-block')
      .maybeSingle();
    
    if (avError) {
      console.error('❌ Error fetching AV-Block:', avError);
    } else if (avBlock) {
      console.log('🔍 AV-Block section details:');
      console.log('Title:', avBlock.title);
      console.log('Type:', avBlock.type);
      console.log('Content HTML length:', avBlock.content_html?.length || 0);
      console.log('Content improved:', JSON.stringify(avBlock.content_improved, null, 2));
      console.log('Content details length:', avBlock.content_details?.length || 0);
    } else {
      console.log('⚠️  AV-Block section not found');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugContentStructure();