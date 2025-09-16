// Test Security System - Run this in browser console
// Make sure you're logged in to test

async function testSecuritySystem() {
  console.log('🔍 Starting Security System Test...');
  
  try {
    // Test 1: Start a simulation
    console.log('\n1️⃣ Testing simulation start...');
    const startResult = await window.simulationTracker?.startSimulation('kp');
    console.log('Start result:', startResult);
    
    if (!startResult?.success) {
      console.error('❌ Failed to start simulation');
      return;
    }
    
    const sessionToken = startResult.sessionToken;
    console.log('✅ Simulation started with token:', sessionToken);
    
    // Test 2: Try to mark as used immediately (should fail)
    console.log('\n2️⃣ Testing premature marking (should fail)...');
    const prematureResult = await window.simulationTracker?.markSimulationUsed(sessionToken, 30);
    console.log('Premature marking result:', prematureResult);
    
    if (prematureResult?.success) {
      console.error('❌ SECURITY ISSUE: Premature marking succeeded when it should fail!');
    } else {
      console.log('✅ Security working: Premature marking blocked');
    }
    
    // Test 3: Send heartbeat
    console.log('\n3️⃣ Testing heartbeat...');
    const heartbeatResult = await window.simulationTracker?.sendHeartbeat(sessionToken);
    console.log('Heartbeat result:', heartbeatResult);
    
    // Test 4: Check session status in database
    console.log('\n4️⃣ Checking database status...');
    const { data: sessions } = await window.supabase
      .from('simulation_usage_logs')
      .select('*')
      .eq('session_token', sessionToken);
    console.log('Database session:', sessions?.[0]);
    
    // Test 5: Update session status
    console.log('\n5️⃣ Testing status update...');
    const statusResult = await window.simulationTracker?.updateSimulationStatus(sessionToken, 'aborted', 100);
    console.log('Status update result:', statusResult);
    
    console.log('\n✅ Security system test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test time manipulation detection
async function testTimeManipulation() {
  console.log('🛡️ Testing time manipulation detection...');
  
  try {
    const startResult = await window.simulationTracker?.startSimulation('fsp');
    if (!startResult?.success) return;
    
    const sessionToken = startResult.sessionToken;
    
    // Try to mark as used with fake client time (10 minutes when server knows it's only been 1 minute)
    const fakeResult = await window.simulationTracker?.markSimulationUsed(sessionToken, 600); // 10 minutes
    console.log('Fake timing result:', fakeResult);
    
    if (!fakeResult?.success && fakeResult?.error?.includes('Server validation')) {
      console.log('✅ Time manipulation detected and blocked!');
    }
    
  } catch (error) {
    console.error('❌ Time manipulation test failed:', error);
  }
}

// Export functions to global scope for testing
window.testSecuritySystem = testSecuritySystem;
window.testTimeManipulation = testTimeManipulation;

console.log('🧪 Security test functions loaded. Run:');
console.log('- testSecuritySystem() to test basic functionality');
console.log('- testTimeManipulation() to test abuse detection');