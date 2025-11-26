import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';

/**
 * DEBUG COMPONENT - Add this temporarily to your dashboard
 * to diagnose subscription counter issues
 *
 * Usage:
 * import { DebugSubscription } from '@/components/DebugSubscription';
 * <DebugSubscription />
 */

export function DebugSubscription() {
  const { user } = useAuth();
  const { subscriptionStatus, checkAccess } = useSubscription(user?.id);
  const [rawData, setRawData] = useState<any>(null);
  const [calculatedData, setCalculatedData] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      fetchRawData();
    }
  }, [user?.id]);

  const fetchRawData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        logger.error('Error fetching raw data:', error);
        return;
      }

      setRawData(data);

      // Calculate what the hook should return
      const tier = data.subscription_tier || 'free';
      const status = data.subscription_status || 'inactive';
      const limit = data.simulation_limit || 0;
      const usedMonthly = data.simulations_used_this_month || 0;
      const usedFree = data.free_simulations_used || 0;

      let totalLimit = 0;
      let usedCount = 0;
      let remaining = 0;
      let canUse = false;

      if (!tier || tier === 'free' || status !== 'active') {
        // FREE TIER
        totalLimit = 3;
        usedCount = usedFree;
        remaining = Math.max(0, 3 - usedFree);
        canUse = remaining > 0;
      } else if (tier === 'unlimited') {
        // UNLIMITED
        totalLimit = 999999;
        usedCount = usedMonthly;
        remaining = 999999;
        canUse = true;
      } else {
        // PAID TIER
        totalLimit = limit;
        usedCount = usedMonthly;
        remaining = Math.max(0, limit - usedMonthly);
        canUse = remaining > 0;
      }

      setCalculatedData({
        tier,
        status,
        totalLimit,
        usedCount,
        remaining,
        canUse,
        counterUsed: tier === 'free' || status !== 'active' ? 'free_simulations_used' : 'simulations_used_this_month'
      });

    } catch (err) {
      logger.error('Error in debug fetch:', err);
    }
  };

  const fixNullLimit = async () => {
    if (!user?.id || !rawData) return;

    const tier = rawData.subscription_tier;
    let newLimit = 30; // default

    if (tier === 'basis') newLimit = 30;
    else if (tier === 'profi') newLimit = 60;
    else if (tier === 'unlimited') newLimit = 999999;
    else if (tier?.startsWith('custom_')) {
      const match = tier.match(/custom_(\d+)/);
      if (match) newLimit = parseInt(match[1]);
    }

    const { error } = await supabase
      .from('users')
      .update({ simulation_limit: newLimit })
      .eq('id', user.id);

    if (error) {
      alert('Error fixing limit: ' + error.message);
    } else {
      alert(`Fixed! Set limit to ${newLimit}`);
      fetchRawData();
      checkAccess();
    }
  };

  const resetCounter = async () => {
    if (!user?.id) return;

    const counterField = calculatedData?.counterUsed || 'simulations_used_this_month';

    const { error } = await supabase
      .from('users')
      .update({ [counterField]: 0 })
      .eq('id', user.id);

    if (error) {
      alert('Error resetting counter: ' + error.message);
    } else {
      alert(`Reset ${counterField} to 0`);
      fetchRawData();
      checkAccess();
    }
  };

  if (!user) {
    return <Text>Not logged in</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 Subscription Debug Panel</Text>

      {/* RAW DATABASE DATA */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Raw Database Data</Text>
        {rawData && (
          <View style={styles.dataBox}>
            <DataRow label="Email" value={rawData.email} />
            <DataRow label="Tier" value={rawData.subscription_tier || 'NULL (FREE)'} />
            <DataRow label="Status" value={rawData.subscription_status || 'NULL (INACTIVE)'} />
            <DataRow
              label="Limit"
              value={rawData.simulation_limit === null ? 'NULL ⚠️' : rawData.simulation_limit}
              alert={rawData.simulation_limit === null}
            />
            <DataRow label="Used (Monthly)" value={rawData.simulations_used_this_month || 0} />
            <DataRow label="Used (Free)" value={rawData.free_simulations_used || 0} />
          </View>
        )}
      </View>

      {/* CALCULATED VALUES */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧮 Calculated Values</Text>
        {calculatedData && (
          <View style={styles.dataBox}>
            <DataRow label="Active Counter" value={calculatedData.counterUsed} />
            <DataRow label="Total Limit" value={calculatedData.totalLimit} />
            <DataRow label="Used Count" value={calculatedData.usedCount} />
            <DataRow label="Remaining" value={calculatedData.remaining} />
            <DataRow
              label="Can Use?"
              value={calculatedData.canUse ? '✅ YES' : '❌ NO'}
              alert={!calculatedData.canUse}
            />
          </View>
        )}
      </View>

      {/* HOOK STATE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎣 Hook State</Text>
        {subscriptionStatus && (
          <View style={styles.dataBox}>
            <DataRow label="Can Use Simulation" value={subscriptionStatus.canUseSimulation ? '✅ YES' : '❌ NO'} />
            <DataRow label="Simulations Used" value={subscriptionStatus.simulationsUsed} />
            <DataRow label="Simulation Limit" value={subscriptionStatus.simulationLimit} />
            <DataRow label="Remaining" value={subscriptionStatus.remainingSimulations} />
            <DataRow label="Message" value={subscriptionStatus.message} />
          </View>
        )}
      </View>

      {/* ISSUE DETECTION */}
      {rawData && calculatedData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Issues Detected</Text>
          <View style={styles.issuesBox}>
            {rawData.simulation_limit === null && rawData.subscription_status === 'active' && (
              <View style={styles.issue}>
                <Text style={styles.issueText}>
                  ⚠️ NULL LIMIT: Your active subscription has NULL simulation_limit. This causes blocking.
                </Text>
                <TouchableOpacity style={styles.fixButton} onPress={fixNullLimit}>
                  <Text style={styles.fixButtonText}>Fix NULL Limit</Text>
                </TouchableOpacity>
              </View>
            )}

            {rawData.simulation_limit !== null && rawData.simulations_used_this_month > rawData.simulation_limit && (
              <View style={styles.issue}>
                <Text style={styles.issueText}>
                  ⚠️ EXCEEDED LIMIT: Used ({rawData.simulations_used_this_month}) exceeds limit ({rawData.simulation_limit})
                </Text>
              </View>
            )}

            {!calculatedData.canUse && calculatedData.remaining > 0 && (
              <View style={styles.issue}>
                <Text style={styles.issueText}>
                  ⚠️ LOGIC ERROR: Remaining is {calculatedData.remaining} but canUse is false
                </Text>
              </View>
            )}

            {rawData.simulation_limit === null &&
             rawData.subscription_tier === null &&
             rawData.subscription_status === null && (
              <View style={styles.issueOk}>
                <Text style={styles.issueOkText}>✅ Free tier - no issues detected</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ACTIONS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛠️ Quick Actions</Text>
        <TouchableOpacity style={styles.actionButton} onPress={fetchRawData}>
          <Text style={styles.actionButtonText}>🔄 Refresh Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={checkAccess}>
          <Text style={styles.actionButtonText}>✅ Re-check Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={resetCounter}>
          <Text style={styles.actionButtonText}>⚠️ Reset Counter (Testing Only)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function DataRow({ label, value, alert }: { label: string; value: any; alert?: boolean }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}:</Text>
      <Text style={[styles.dataValue, alert && styles.dataValueAlert]}>
        {value === null || value === undefined ? 'NULL' : String(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F3E8',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B15740',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#B15740',
    marginBottom: 12,
  },
  dataBox: {
    gap: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  dataValueAlert: {
    color: '#EF4444',
  },
  issuesBox: {
    gap: 12,
  },
  issue: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 12,
    borderRadius: 8,
  },
  issueText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 8,
  },
  issueOk: {
    backgroundColor: '#D1FAE5',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    padding: 12,
    borderRadius: 8,
  },
  issueOkText: {
    fontSize: 14,
    color: '#065F46',
  },
  fixButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  fixButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#B15740',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
