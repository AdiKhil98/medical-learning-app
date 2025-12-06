const fs = require('fs');

console.log('📝 Updating switch cases...');

const filePath = './netlify/functions/lemonsqueezy-UPDATED.js';
let content = fs.readFileSync(filePath, 'utf8');

// First, add the subscriptionData preparation before the switch statement
const tierConfigLine = 'const tierConfig = SUBSCRIPTION_TIERS[tier];';
const subscriptionDataPrep = `
    // Prepare subscription data for upsert function
    const subscriptionData = {
      subscriptionId: String(subscriptionId),
      variantId: variantId,
      variantName: variantName || tierConfig.name,
      customerEmail: customerEmail,
      tier: tier,
      status: status,
      simulationLimit: tierConfig.simulationLimit,
      createdAt: attributes.created_at ? new Date(attributes.created_at).toISOString() : new Date().toISOString(),
      updatedAt: attributes.updated_at ? new Date(attributes.updated_at).toISOString() : new Date().toISOString(),
      expiresAt: attributes.ends_at ? new Date(attributes.ends_at).toISOString() : null,
      renewsAt: attributes.renews_at ? new Date(attributes.renews_at).toISOString() : null,
      periodStart: attributes.billing_anchor ? new Date(attributes.billing_anchor).toISOString() : new Date().toISOString(),
      periodEnd: attributes.renews_at ? new Date(attributes.renews_at).toISOString() : null
    };
`;

content = content.replace(tierConfigLine, tierConfigLine + subscriptionDataPrep);

// Now replace each case in the switch statement

// 1. Replace subscription_created case
const oldCreatedCase = /case 'subscription_created':[\s\S]*?break;/;
const newCreatedCase = `case 'subscription_created':
        console.log(\`📝 Creating subscription for user \${userId}\`);

        const createResult = await upsertSubscriptionViaFunction(userId, subscriptionData, eventType);

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed');
        console.log(\`✅ Subscription created successfully for user \${userId}\`);
        console.log('Create result:', createResult);
        break;`;

content = content.replace(oldCreatedCase, newCreatedCase);

// 2. Replace subscription_updated case
const oldUpdatedCase = /case 'subscription_updated':[\s\S]*?break;/;
const newUpdatedCase = `case 'subscription_updated':
        console.log(\`🔄 Updating subscription for user \${userId}\`);

        // Re-determine tier in case of upgrade/downgrade
        const newTier = determineSubscriptionTier(variantName, variantId);
        const newTierConfig = SUBSCRIPTION_TIERS[newTier];

        subscriptionData.tier = newTier;
        subscriptionData.simulationLimit = newTierConfig.simulationLimit;

        const updateResult = await upsertSubscriptionViaFunction(userId, subscriptionData, eventType);

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed');
        console.log(\`✅ Subscription updated successfully for user \${userId}\`);
        console.log('Update result:', updateResult);

        // Check if tier changed (upgrade/downgrade)
        if (updateResult && updateResult.sync_result && updateResult.sync_result.tier_changed) {
          console.log(\`🎉 TIER CHANGED: \${updateResult.sync_result.old_tier} → \${updateResult.sync_result.new_tier}\`);
          console.log('✅ Counter automatically reset by sync function');
        }
        break;`;

content = content.replace(oldUpdatedCase, newUpdatedCase);

// 3. Replace subscription_cancelled case
const oldCancelledCase = /case 'subscription_cancelled':[\s\S]*?break;/;
const newCancelledCase = `case 'subscription_cancelled':
        console.log(\`❌ Cancelling subscription for user \${userId}\`);

        subscriptionData.status = 'cancelled';

        const cancelResult = await upsertSubscriptionViaFunction(userId, subscriptionData, eventType);

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed');
        console.log(\`✅ Subscription cancelled for user \${userId}, access until \${subscriptionData.expiresAt}\`);
        console.log('Cancel result:', cancelResult);
        break;`;

content = content.replace(oldCancelledCase, newCancelledCase);

// 4. Replace subscription_expired case
const oldExpiredCase = /case 'subscription_expired':[\s\S]*?break;/;
const newExpiredCase = `case 'subscription_expired':
        console.log(\`⏰ Expiring subscription for user \${userId}\`);

        subscriptionData.status = 'expired';
        subscriptionData.expiresAt = new Date().toISOString();

        const expireResult = await upsertSubscriptionViaFunction(userId, subscriptionData, eventType);

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed');
        console.log(\`✅ Subscription expired for user \${userId}, access removed\`);
        console.log('Expire result:', expireResult);
        break;`;

content = content.replace(oldExpiredCase, newExpiredCase);

// Save the final updated file
fs.writeFileSync(filePath, content);

console.log('✅ Switch cases updated successfully!');
console.log('\n📋 File ready at: netlify/functions/lemonsqueezy-UPDATED.js');
console.log('\n🎯 To deploy:');
console.log('   cp netlify/functions/lemonsqueezy-UPDATED.js netlify/functions/lemonsqueezy.js');
