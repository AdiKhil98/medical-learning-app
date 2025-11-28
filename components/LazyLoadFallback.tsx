/**
 * Lazy Load Fallback Component
 *
 * Loading state shown while lazy-loaded components are being fetched.
 * Provides a smooth user experience during code splitting.
 *
 * Usage:
 *   <Suspense fallback={<LazyLoadFallback />}>
 *     <LazyComponent />
 *   </Suspense>
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface LazyLoadFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

export function LazyLoadFallback({
  message = 'Lädt...',
  fullScreen = true,
}: LazyLoadFallbackProps) {
  return (
    <View style={fullScreen ? styles.containerFullScreen : styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  containerFullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  container: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default LazyLoadFallback;
