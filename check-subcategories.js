const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Check sub-categories for each main category
  const mainCategories = ['chirurgie', 'innere-medizin', 'notfallmedizin', 'infektiologie', 'urologie', 'radiologie'];
  
  for (const mainSlug of mainCategories) {
    console.log(`\n=== SUB-CATEGORIES FOR: ${mainSlug.toUpperCase()} ===`);
    
    const { data: subCategories, error } = await supabase
      .from('sections')
      .select('slug, title, type, display_order, parent_slug')
      .eq('parent_slug', mainSlug)  // Find items that belong to this main category
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error(`Error for ${mainSlug}:`, error);
      continue;
    }
    
    if (!subCategories || subCategories.length === 0) {
      console.log('  No sub-categories found');
      continue;
    }
    
    console.log(`  Found ${subCategories.length} sub-categories:`);
    subCategories.forEach(sub => {
      console.log(`    ${sub.display_order}. ${sub.title} (${sub.type}) [${sub.slug}]`);
    });
  }
})();