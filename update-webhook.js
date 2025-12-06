const fs = require('fs');
const path = require('path');

console.log('📝 Reading original webhook handler...');

const originalPath = './netlify/functions/lemonsqueezy.js';
const backupPath = './netlify/functions/lemonsqueezy.js.backup2';
const newPath = './netlify/functions/lemonsqueezy-UPDATED.js';

// Read the original file
const original = fs.readFileSync(originalPath, 'utf8');

// Create another backup just in case
fs.writeFileSync(backupPath, original);
console.log('✅ Backup created');

// Read our prepared updated version from a template
const lines = original.split('\n');
let output = [];
let inOldFunction = false;
let skipUntilBrace = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Skip the old updateUserSubscription function
  if (line.includes('// Helper function to update user subscription')) {
    inOldFunction = true;
    // Add new function instead
    output.push('// NEW: Use existing upsert_subscription_from_webhook database function');
    output.push('async function upsertSubscriptionViaFunction(userId, subscriptionData, eventType) {');
    output.push('  const {');
    output.push('    subscriptionId,');
    output.push('    variantId,');
    output.push('    variantName,');
    output.push('    customerEmail,');
    output.push('    tier,');
    output.push('    status,');
    output.push('    simulationLimit,');
    output.push('    createdAt,');
    output.push('    updatedAt,');
    output.push('    expiresAt,');
    output.push('    renewsAt,');
    output.push('    periodStart,');
    output.push('    periodEnd');
    output.push('  } = subscriptionData;');
    output.push('');
    output.push('  console.log(\'🔄 Calling upsert_subscription_from_webhook:\', {');
    output.push('    userId,');
    output.push('    subscriptionId,');
    output.push('    tier,');
    output.push('    status,');
    output.push('    variantId');
    output.push('  });');
    output.push('');
    output.push('  const { data, error } = await supabase.rpc(\'upsert_subscription_from_webhook\', {');
    output.push('    p_user_id: userId,');
    output.push('    p_lemonsqueezy_subscription_id: subscriptionId,');
    output.push('    p_tier: tier,');
    output.push('    p_status: status,');
    output.push('    p_variant_id: String(variantId),');
    output.push('    p_variant_name: variantName,');
    output.push('    p_customer_email: customerEmail,');
    output.push('    p_simulation_limit: simulationLimit,');
    output.push('    p_created_at: createdAt,');
    output.push('    p_updated_at: updatedAt,');
    output.push('    p_expires_at: expiresAt,');
    output.push('    p_renews_at: renewsAt,');
    output.push('    p_period_start: periodStart,');
    output.push('    p_period_end: periodEnd,');
    output.push('    p_webhook_event: eventType');
    output.push('  });');
    output.push('');
    output.push('  if (error) {');
    output.push('    console.error(\'❌ Error calling upsert_subscription_from_webhook:\', error);');
    output.push('    throw error;');
    output.push('  }');
    output.push('');
    output.push('  console.log(\'✅ Upsert successful:\', data);');
    output.push('  return data;');
    output.push('}');
    output.push('');
    continue;
  }
  
  if (inOldFunction) {
    if (line.trim() === '}') {
      inOldFunction = false;
    }
    continue;
  }
  
  output.push(line);
}

const result = output.join('\n');
fs.writeFileSync(newPath, result);

console.log('✅ Updated webhook handler created at:',newPath);
console.log('\n📋 Next steps:');
console.log('1. Review the file: netlify/functions/lemonsqueezy-UPDATED.js');
console.log('2. If it looks good, run: cp netlify/functions/lemonsqueezy-UPDATED.js netlify/functions/lemonsqueezy.js');
console.log('3. Then we\'ll update the switch cases');
