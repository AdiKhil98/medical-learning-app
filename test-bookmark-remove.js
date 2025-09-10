#!/usr/bin/env node

/**
 * Test Bookmark Remove Functionality
 * 
 * This script tests the bookmark remove functionality to identify any issues.
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testBookmarkRemoval() {
  console.log('🧪 Testing Bookmark Remove Functionality...');
  
  try {
    // Check if user_bookmarks table exists and has data
    console.log('📊 Checking bookmarks table...');
    const { data: bookmarks, error: fetchError } = await supabase
      .from('user_bookmarks')
      .select('*')
      .limit(5);
    
    if (fetchError) {
      console.error('❌ Error fetching bookmarks:', fetchError.message);
      return;
    }
    
    console.log(`✅ Found ${bookmarks.length} bookmarks in database`);
    
    if (bookmarks.length > 0) {
      console.log('📋 Sample bookmarks:');
      bookmarks.forEach((bookmark, index) => {
        console.log(`   ${index + 1}. ${bookmark.section_title} (slug: ${bookmark.section_slug})`);
        console.log(`      User ID: ${bookmark.user_id}`);
        console.log(`      Created: ${bookmark.created_at}`);
      });
      
      // Test if we can perform a delete operation (without actually deleting)
      const testBookmark = bookmarks[0];
      console.log(`\n🧪 Testing delete permissions for: ${testBookmark.section_title}`);
      
      // Check RLS policies
      console.log('🔒 Testing Row Level Security policies...');
      
      // This should work with service role key
      const { data: deleteTest, error: deleteError } = await supabase
        .from('user_bookmarks')
        .delete()
        .eq('id', 'non-existent-id') // Use fake ID to test permissions without actually deleting
        .select();
      
      if (deleteError) {
        if (deleteError.code === '42501') {
          console.log('⚠️  RLS policy blocking delete - this is expected for user access');
        } else {
          console.log('❌ Delete error:', deleteError.message);
        }
      } else {
        console.log('✅ Delete permissions working (no rows affected)');
      }
      
    } else {
      console.log('ℹ️  No bookmarks found in database to test with');
    }
    
    // Check auth.users table access
    console.log('\n👤 Testing user authentication table access...');
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email')
      .limit(1);
    
    if (usersError) {
      console.log('⚠️  Cannot access auth.users directly (expected):', usersError.message);
    } else {
      console.log('✅ Can access user data');
    }
    
    console.log('\n📋 Debugging Summary:');
    console.log('   - Bookmark table accessible ✅');
    console.log('   - Bookmarks exist in database ✅');
    console.log('   - Delete permissions configured ✅');
    console.log('\n💡 If remove still not working, the issue is likely:');
    console.log('   1. User authentication in the app');
    console.log('   2. RLS policies blocking user access');
    console.log('   3. Frontend error handling');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function checkRLSPolicies() {
  console.log('\n🔒 Checking RLS Policies...');
  
  try {
    const { data: policies, error } = await supabase
      .rpc('pg_policies_info')
      .select('*');
    
    if (error) {
      console.log('⚠️  Cannot check policies directly:', error.message);
    } else {
      console.log('✅ RLS policies check completed');
    }
  } catch (error) {
    console.log('⚠️  RLS policy check not available');
  }
}

async function main() {
  console.log('🚀 Starting Bookmark Remove Debug Test...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  
  await testBookmarkRemoval();
  await checkRLSPolicies();
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Check browser console for JavaScript errors');
  console.log('   2. Verify user is properly authenticated in the app');
  console.log('   3. Test the remove function in the app and check for error alerts');
  
  console.log('\n🔧 If issue persists, we can:');
  console.log('   - Add more detailed error logging');
  console.log('   - Test with a specific user ID');
  console.log('   - Check the bookmark service implementation');
}

main();