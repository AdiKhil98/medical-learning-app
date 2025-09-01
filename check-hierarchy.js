const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== MAIN CATEGORIES (no parent_slug) ===');
  const { data: mainCategories, error: mainError } = await supabase
    .from('sections')
    .select('slug, title, type, display_order, parent_slug')
    .is('parent_slug', null)
    .order('display_order');
  
  if (mainError) {
    console.error('Error fetching main categories:', mainError);
    return;
  }
  
  console.log(`Found ${mainCategories?.length || 0} main categories:`);
  mainCategories?.forEach(cat => {
    console.log(`${cat.display_order}. ${cat.title} (${cat.type}) [${cat.slug}]`);
  });
  
  console.log('\n=== SAMPLE SUB-CATEGORIES ===');
  const { data: subCategories, error: subError } = await supabase
    .from('sections')
    .select('slug, title, type, display_order, parent_slug')
    .not('parent_slug', 'is', null)
    .limit(15)
    .order('display_order');
    
  if (subError) {
    console.error('Error fetching sub categories:', subError);
    return;
  }
  
  console.log(`Found ${subCategories?.length || 0} sub categories (showing first 15):`);
  subCategories?.forEach(sub => {
    console.log(`${sub.display_order}. ${sub.title} (${sub.type}) -> parent: ${sub.parent_slug}`);
  });
  
  // Check content_improved column
  console.log('\n=== CONTENT CHECK ===');
  const { data: contentSample } = await supabase
    .from('sections')
    .select('slug, title, type, content_improved')
    .not('content_improved', 'is', null)
    .limit(3);
    
  console.log('Samples with content_improved:');
  contentSample?.forEach(item => {
    console.log(`- ${item.title} (${item.type}): ${item.content_improved ? 'HAS CONTENT' : 'NO CONTENT'}`);
  });
})();