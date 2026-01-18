import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';

export const SubscriptionTest = () => {
  const { user } = useAuth();
  const {
    subscriptionStatus,
    loading,
    error,
    canUseSimulation,
    recordUsage
  } = useSubscription(user?.id);

  const handleTestSimulation = async () => {
    if (canUseSimulation) {
      const success = await recordUsage();
      if (success) {
        alert('✅ Simulation allowed! Usage incremented.');
      } else {
        alert('❌ Error recording usage');
      }
    } else {
      alert('❌ Simulation blocked - limit reached!');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>Loading subscription...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Subscription System Test</Text>
      
      {error ? (
        <Text style={styles.error}>Error: {error}</Text>
      ) : (
        <>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Plan:</Text>
            <Text style={styles.value}>{subscriptionStatus?.subscriptionTier || 'None'}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{subscriptionStatus?.canUseSimulation ? 'Active' : 'Limited'}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Simulations Used:</Text>
            <Text style={styles.value}>
              {subscriptionStatus?.simulationsUsed || 0}
              {subscriptionStatus?.simulationLimit ? ` / ${subscriptionStatus.simulationLimit}` : ' / ∞'}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Remaining:</Text>
            <Text style={styles.value}>
              {subscriptionStatus?.simulationLimit
                ? (subscriptionStatus.simulationLimit - subscriptionStatus.simulationsUsed)
                : '∞'}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Can Use Simulation:</Text>
            <Text style={[styles.value, canUseSimulation ? styles.success : styles.error]}>
              {canUseSimulation ? '✅ Yes' : '❌ No'}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.testButton} 
            onPress={handleTestSimulation}
          >
            <Text style={styles.buttonText}>Test Simulation Access</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    marginVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  label: {
    fontWeight: '600',
    color: '#495057',
  },
  value: {
    color: '#212529',
  },
  success: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  error: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  status: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#6c757d',
  },
  testButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginTop: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});