# How to Update app/subscription.tsx

## Replace the handleSelectPlan function with this:

```typescript
const handleSelectPlan = async (planId: string) => {
  logger.info('Selected plan:', planId);

  // Prevent spamming
  if (isUpdating) {
    return;
  }

  if (!user?.id) {
    Alert.alert('Fehler', 'Sie müssen angemeldet sein, um ein Abonnement zu ändern.');
    return;
  }

  if (planId === 'free') {
    await handleFreePlanSelection();
    return;
  }

  // Map planId to variant_id
  const variantIdMapping: Record<string, number> = {
    'basic': 1006948,
    'professional': 1006934,
    'unlimited': 1006947
  };

  const newVariantId = variantIdMapping[planId];
  if (!newVariantId) {
    Alert.alert('Fehler', `Plan "${planId}" ist noch nicht verfügbar`);
    return;
  }

  setIsUpdating(true);
  setLoadingMessage('Überprüfe aktuelles Abonnement...');

  try {
    // STEP 1: Check if user has active subscription
    const { data: existingSubscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'on_trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      logger.error('Error checking subscription:', subError);
      Alert.alert('Fehler', 'Fehler beim Überprüfen des Abonnements');
      setIsUpdating(false);
      return;
    }

    // STEP 2A: User has active subscription → UPGRADE/DOWNGRADE
    if (existingSubscription) {
      logger.info('✅ User has existing subscription, upgrading/downgrading...');
      setLoadingMessage('Abo wird aktualisiert...');

      const response = await fetch('/.netlify/functions/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          newVariantId: newVariantId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        logger.error('Plan change failed:', result);
        Alert.alert('Fehler', result.message || result.error || 'Fehler beim Ändern des Plans');
        setIsUpdating(false);
        return;
      }

      logger.info('✅ Plan changed successfully:', result);
      setLoadingMessage('Erfolgreich! Aktualisiere Daten...');

      // Refresh subscription data
      await checkAccess();

      Alert.alert(
        'Erfolgreich!',
        'Ihr Plan wurde erfolgreich geändert. Die Änderung wird in Kürze aktiv.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)/dashboard');
            }
          }
        ]
      );
    }
    // STEP 2B: User has NO subscription → NEW CHECKOUT
    else {
      logger.info('ℹ️ User has no subscription, redirecting to checkout...');
      setLoadingMessage('Weiterleitung zum Checkout...');

      const userEmail = encodeURIComponent(user?.email || '');
      const checkoutUrls: Record<string, string> = {
        'basic': `https://kpmed.lemonsqueezy.com/buy/b45b24cd-f6c7-48b5-8f7d-f08d6b793e20?enabled=1006948&checkout[email]=${userEmail}`,
        'professional': `https://kpmed.lemonsqueezy.com/buy/cf4938e1-62b0-47f8-9d39-4a60807594d6?enabled=1006934&checkout[email]=${userEmail}`,
        'unlimited': `https://kpmed.lemonsqueezy.com/buy/7fca01cc-1a9a-4f8d-abda-cc939f375320?enabled=1006947&checkout[email]=${userEmail}`
      };

      const checkoutUrl = checkoutUrls[planId];
      if (checkoutUrl) {
        Linking.openURL(checkoutUrl);
      }
    }
  } catch (error) {
    logger.error('Error in handleSelectPlan:', error);
    Alert.alert('Fehler', 'Ein unerwarteter Fehler ist aufgetreten');
  } finally {
    setIsUpdating(false);
    setLoadingMessage('');
  }
};
```

## Also add this import at the top:

```typescript
import { supabase } from '@/lib/supabase';
```

