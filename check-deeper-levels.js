const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Check what happens when we click on a sub-category
  // Let's check "kardiologie" as an example
  console.log('=== SECTIONS UNDER KARDIOLOGIE ===');
  
  const { data: sections, error } = await supabase
    .from('sections')
    .select('slug, title, type, display_order, parent_slug, content_improved')
    .eq('parent_slug', 'kardiologie')
    .order('display_order', { ascending: true });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${sections?.length || 0} sections under kardiologie:`);
  sections?.forEach(section => {
    const hasContent = section.content_improved ? 'HAS CONTENT' : 'NO CONTENT';
    console.log(`  ${section.display_order}. ${section.title} (${section.type}) [${section.slug}] - ${hasContent}`);
  });
  
  // Now let's check what's under one of these sections
  if (sections && sections.length > 0) {
    const firstSection = sections[0];
    console.log(`\n=== SUB-SECTIONS UNDER: ${firstSection.title} ===`);
    
    const { data: subSections } = await supabase
      .from('sections')
      .select('slug, title, type, display_order, parent_slug, content_improved')
      .eq('parent_slug', firstSection.slug)
      .order('display_order', { ascending: true });
    
    if (subSections && subSections.length > 0) {
      console.log(`Found ${subSections.length} sub-sections:`);
      subSections.forEach(subSection => {
        const hasContent = subSection.content_improved ? 'HAS CONTENT' : 'NO CONTENT';
        console.log(`    ${subSection.display_order}. ${subSection.title} (${subSection.type}) [${subSection.slug}] - ${hasContent}`);
      });
      
      // Check one more level deep
      const firstSubSection = subSections[0];
      console.log(`\n=== SUB-SUB-SECTIONS UNDER: ${firstSubSection.title} ===`);
      
      const { data: subSubSections } = await supabase
        .from('sections')
        .select('slug, title, type, display_order, parent_slug, content_improved')
        .eq('parent_slug', firstSubSection.slug)
        .order('display_order', { ascending: true });
      
      if (subSubSections && subSubSections.length > 0) {
        console.log(`Found ${subSubSections.length} sub-sub-sections:`);
        subSubSections.forEach(subSubSection => {
          const hasContent = subSubSection.content_improved ? 'HAS CONTENT' : 'NO CONTENT';
          console.log(`      ${subSubSection.display_order}. ${subSubSection.title} (${subSubSection.type}) [${subSubSection.slug}] - ${hasContent}`);
        });
      } else {
        console.log('    No sub-sub-sections found');
      }
    } else {
      console.log('  No sub-sections found');
      if (firstSection.content_improved) {
        console.log(`  ✅ This section HAS FINAL CONTENT to display!`);
      }
    }
  }
})();