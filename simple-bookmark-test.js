// Simple test to check bookmark functionality
// Add this to any page temporarily for testing

console.log('🧪 Simple Bookmark Test Starting...');

// Test 1: Check if user is authenticated
async function testAuthentication() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = 'https://pavjavrijaihnwbydfrk.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdmphdnJpamFpaG53YnlkZnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDM4NjYsImV4cCI6MjA2MDcxOTg2Nn0.4VrlhzIdV6F8cypZlVuYwE61GspATdFcjh0ebViOHIs';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Auth Error:', error);
      return false;
    }
    
    if (user) {
      console.log('✅ User authenticated:', user.email, 'ID:', user.id);
      return true;
    } else {
      console.log('❌ No user authenticated');
      return false;
    }
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

// Test 2: Check if bookmark table is accessible
async function testBookmarkTable() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = 'https://pavjavrijaihnwbydfrk.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdmphdnJpamFpaG53YnlkZnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDM4NjYsImV4cCI6MjA2MDcxOTg2Nn0.4VrlhzIdV6F8cypZlVuYwE61GspATdFcjh0ebViOHIs';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data, error } = await supabase
      .from('user_bookmarks')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Bookmark table error:', error);
      return false;
    }
    
    console.log('✅ Bookmark table accessible, found', data.length, 'bookmarks');
    console.log('📋 Sample bookmarks:', data);
    return true;
  } catch (error) {
    console.error('❌ Table test error:', error);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting bookmark functionality tests...');
  
  const authTest = await testAuthentication();
  const tableTest = await testBookmarkTable();
  
  console.log('\n📊 Test Results:');
  console.log('   Authentication:', authTest ? '✅ PASS' : '❌ FAIL');
  console.log('   Table Access:', tableTest ? '✅ PASS' : '❌ FAIL');
  
  if (!authTest) {
    console.log('\n🔧 Authentication issue - user needs to log in');
  }
  
  if (!tableTest) {
    console.log('\n🔧 Table access issue - check RLS policies or table creation');
  }
  
  if (authTest && tableTest) {
    console.log('\n✨ Basic functionality should work - check remove function specifically');
  }
}

// Export for use in React Native
if (typeof window !== 'undefined') {
  window.testBookmarks = runTests;
  console.log('💡 Run window.testBookmarks() in browser console to test');
}

module.exports = { runTests, testAuthentication, testBookmarkTable };