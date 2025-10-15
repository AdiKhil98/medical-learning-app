import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * EMERGENCY DIAGNOSTIC - Shows ACTUAL database values
 * Add this to your KP simulation page temporarily
 */
export function QuickDiagnostic() {
  const { user } = useAuth();
  const [dbData, setDbData] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status, simulation_limit, simulations_used_this_month, free_simulations_used')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Diagnostic error:', error);
      return;
    }

    setDbData(data);
    console.log('🔍 DIAGNOSTIC - Raw DB Data:', data);
  };

  const resetCounter = async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('users')
      .update({ simulations_used_this_month: 0 })
      .eq('id', user.id);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Counter reset to 0!');
      fetchData();
    }
  };

  if (!dbData) return null;

  const used = dbData.simulations_used_this_month || 0;
  const limit = dbData.simulation_limit || 30;
  const shouldAllow = used < limit;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 EMERGENCY DIAGNOSTIC</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Database Used:</Text>
        <Text style={styles.value}>{used}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Database Limit:</Text>
        <Text style={styles.value}>{limit}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Calculation:</Text>
        <Text style={styles.value}>{used} &lt; {limit} = {shouldAllow ? 'TRUE ✅' : 'FALSE ❌'}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Should Allow?</Text>
        <Text style={[styles.value, shouldAllow ? styles.green : styles.red]}>
          {shouldAllow ? '✅ YES' : '❌ NO'}
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={resetCounter}>
        <Text style={styles.buttonText}>🔧 Reset Counter to 0</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={fetchData}>
        <Text style={styles.buttonText}>🔄 Refresh Data</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFE8D6',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FF9A3D',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B15740',
    marginBottom: 16,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  green: {
    color: '#22c55e',
  },
  red: {
    color: '#EF4444',
  },
  button: {
    backgroundColor: '#B15740',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
