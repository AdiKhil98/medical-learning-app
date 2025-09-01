// Test Supabase connection with authentication
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pavjavrijaihnwbydfrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdmphdnJpamFpaG53YnlkZnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDM4NjYsImV4cCI6MjA2MDcxOTg2Nn0.4VrlhzIdV6F8cypZlVuYwE61GspATdFcjh0ebViOHIs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testWithAuth() {
  console.log('🔍 Testing Supabase with different auth states...\n');
  
  try {
    // Test 1: Check if sections are public (no auth required)
    console.log('1. Testing public access (no auth)...');
    const { data: publicData, error: publicError, count: publicCount } = await supabase
      .from('sections')
      .select('*', { count: 'exact' })
      .limit(5);
    
    console.log('Public access result:', { 
      recordCount: publicCount, 
      hasData: !!publicData?.length, 
      error: publicError?.message 
    });

    if (publicCount > 0) {
      console.log('✅ Sections table is publicly accessible!');
      console.log(`Found ${publicCount} total sections`);
      
      if (publicData && publicData.length > 0) {
        console.log('\n📋 Sample sections:');
        publicData.forEach((section, i) => {
          console.log(`  ${i + 1}. ${section.title} (${section.slug}) - Parent: ${section.parent_slug || 'ROOT'}`);
        });
      }
      
      // Test root sections
      console.log('\n🌳 Testing root sections...');
      const { data: rootSections, error: rootError } = await supabase
        .from('sections')
        .select('*')
        .is('parent_slug', null)
        .order('display_order');
      
      if (rootError) {
        console.error('❌ Error fetching root sections:', rootError.message);
      } else {
        console.log(`✅ Root sections found: ${rootSections?.length || 0}`);
        if (rootSections && rootSections.length > 0) {
          rootSections.forEach((section, i) => {
            console.log(`  ${i + 1}. ${section.title} (${section.slug})`);
          });
        }
      }
      return;
    }

    // If no public access, sections might require auth
    console.log('⚠️  No public access detected. Testing if authentication is required...');
    
    // Test 2: Check if we can create a session with a test user
    console.log('\n2. Checking if test authentication helps...');
    console.log('Note: This would require valid credentials, which we don\'t have for security.');
    console.log('The sections table likely requires RLS policies with authenticated users.');
    
    // Test 3: Check table permissions without trying to authenticate
    console.log('\n3. Investigating possible solutions...');
    console.log('Possible causes:');
    console.log('- RLS (Row Level Security) enabled on sections table');
    console.log('- Table requires authenticated user access');
    console.log('- Anon key might not have proper permissions');
    console.log('- Table might be in a different schema');
    
    // Let's try one more approach - check if we can see the table structure
    console.log('\n4. Testing if we can see table structure...');
    
    // Try a very simple query that might bypass RLS
    const { data: schemaTest, error: schemaError } = await supabase
      .from('sections')
      .select('slug')
      .limit(0);  // No data, just test structure
    
    console.log('Schema test result:', {
      canSeeTable: !schemaError,
      error: schemaError?.message
    });
    
  } catch (e) {
    console.error('💥 Test failed:', e.message);
  }
}

async function testServiceRoleAccess() {
  console.log('\n🔧 Note about Service Role:');
  console.log('If the sections table has RLS enabled, you might need to:');
  console.log('1. Use the service role key (bypasses RLS) - for server-side only');
  console.log('2. Create proper RLS policies for anonymous access');
  console.log('3. Ensure authenticated users have access');
  console.log('4. Check if the table exists in the public schema');
}

testWithAuth().then(() => {
  testServiceRoleAccess();
});