const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== CHECKING ADMIN USERS ===');
  
  // Check all users with admin role
  const { data: adminUsers, error } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .eq('role', 'admin');
  
  if (error) {
    console.error('Error fetching admin users:', error);
    return;
  }
  
  console.log(`Found ${adminUsers?.length || 0} admin users:`);
  adminUsers?.forEach(user => {
    console.log(`- ${user.email} (${user.name}) - Role: ${user.role}`);
  });
  
  console.log('\n=== ALL USERS (first 10) ===');
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .limit(10);
    
  allUsers?.forEach(user => {
    console.log(`- ${user.email} (${user.name}) - Role: ${user.role || 'no role set'}`);
  });
})();