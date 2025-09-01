// Simple Node.js script to test Supabase connection
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pavjavrijaihnwbydfrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdmphdnJpamFpaG53YnlkZnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDM4NjYsImV4cCI6MjA2MDcxOTg2Nn0.4VrlhzIdV6F8cypZlVuYwE61GspATdFcjh0ebViOHIs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test 1: Check if sections table exists and get count
    console.log('\n📊 Testing sections table...');
    const { data, error, count } = await supabase
      .from('sections')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.error('❌ Error accessing sections table:', error.message);
      return;
    }
    
    console.log(`✅ Sections table accessible! Found ${count} total sections`);
    
    if (data && data.length > 0) {
      console.log('\n📋 Sample sections:');
      data.forEach((section, i) => {
        console.log(`  ${i + 1}. ${section.title} (${section.slug}) - Parent: ${section.parent_slug || 'ROOT'}`);
      });
    } else {
      console.log('⚠️  Sections table is empty');
    }
    
    // Test 2: Check root sections specifically
    console.log('\n🌳 Testing root sections...');
    const { data: rootSections, error: rootError } = await supabase
      .from('sections')
      .select('*')
      .is('parent_slug', null)
      .order('display_order');
    
    if (rootError) {
      console.error('❌ Error fetching root sections:', rootError.message);
      return;
    }
    
    console.log(`✅ Root sections found: ${rootSections?.length || 0}`);
    if (rootSections && rootSections.length > 0) {
      rootSections.forEach((section, i) => {
        console.log(`  ${i + 1}. ${section.title} (${section.slug})`);
      });
    }
    
  } catch (e) {
    console.error('💥 Connection test failed:', e.message);
  }
}

testConnection();