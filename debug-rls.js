// Debug RLS and check table structure
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pavjavrijaihnwbydfrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdmphdnJpamFpaG53YnlkZnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDM4NjYsImV4cCI6MjA2MDcxOTg2Nn0.4VrlhzIdV6F8cypZlVuYwE61GspATdFcjh0ebViOHIs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugRLS() {
  console.log('🔍 Debugging RLS and table access...\n');
  
  try {
    // Test 1: Try to access table with RLS bypass (service role would be needed)
    console.log('1. Testing basic table access...');
    const { data, error, count } = await supabase
      .from('sections')
      .select('*', { count: 'exact' })
      .limit(1);
    
    console.log('Basic query result:', { 
      recordCount: count, 
      hasData: !!data?.length, 
      error: error?.message 
    });

    // Test 2: Check if we can see table structure
    console.log('\n2. Testing table structure access...');
    const { data: structureData, error: structureError } = await supabase
      .from('sections')
      .select('id')
      .limit(1);
    
    console.log('Structure query result:', { 
      canAccessTable: !structureError, 
      error: structureError?.message 
    });

    // Test 3: Try a different approach - check current user
    console.log('\n3. Testing current user session...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Current user:', { 
      isAuthenticated: !!user, 
      userId: user?.id, 
      error: userError?.message 
    });

    // Test 4: Try with explicit RLS bypass attempt
    console.log('\n4. Testing with different query approach...');
    const { data: directData, error: directError } = await supabase
      .rpc('get_sections_count')
      .catch(() => ({ data: null, error: { message: 'RPC function not available' } }));
    
    console.log('RPC query result:', { 
      data: directData, 
      error: directError?.message 
    });

    // Test 5: Check if we can insert (to test write permissions)
    console.log('\n5. Testing write permissions...');
    const testInsert = await supabase
      .from('sections')
      .insert({
        slug: 'test-access-' + Date.now(),
        title: 'Test Access',
        description: 'Testing RLS access',
        type: 'folder',
        icon: 'Test',
        color: '#000000',
        display_order: 999,
        parent_slug: null
      })
      .select();
    
    console.log('Insert test result:', { 
      canInsert: !testInsert.error, 
      error: testInsert.error?.message 
    });

    if (testInsert.data?.length > 0) {
      // Clean up test record
      await supabase
        .from('sections')
        .delete()
        .eq('id', testInsert.data[0].id);
      console.log('✅ Test record cleaned up');
    }

  } catch (e) {
    console.error('💥 Debug failed:', e.message);
  }
}

debugRLS();