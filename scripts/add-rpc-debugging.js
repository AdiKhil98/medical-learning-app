const fs = require('fs');
const path = require('path');

console.log('📝 Adding RPC debugging to simulationTrackingService.ts\n');

const filePath = path.join(__dirname, '..', 'lib', 'simulationTrackingService.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Add detailed logging after the RPC call
const newContent = content.replace(
  /const { data, error } = await supabase\.rpc\('mark_simulation_counted', {[\s\S]*?}\);/,
  `const { data, error } = await supabase.rpc('mark_simulation_counted', {
        p_session_token: sessionToken,
        p_user_id: user.id,
      });

      // 🔍 ADDED DEBUG LOGGING
      console.log('🔍 DEBUG: RPC CALL COMPLETED');
      console.log('🔍 DEBUG: Error object:', error);
      console.log('🔍 DEBUG: Data object:', data);
      console.log('🔍 DEBUG: Error message:', error?.message);
      console.log('🔍 DEBUG: Error code:', error?.code);
      console.log('🔍 DEBUG: Data.success:', data?.success);`
);

fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✅ Added debugging logs to simulationTrackingService.ts');
console.log('\nNow you will see:');
console.log('- Whether the RPC call completes');
console.log('- The exact error (if any)');
console.log('- The exact response data');
console.log('\nRestart your dev server and try again!');
