/**
 * Simulation Layout with Code Splitting
 *
 * Lazy loads simulation screens to reduce initial bundle size.
 * KP and FSP are heavy screens (~2700 lines each) that don't need to load upfront.
 */

import React from 'react';
import { Stack } from 'expo-router';

export default function SimulationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Enable lazy loading for better performance
        lazy: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="fsp"
        options={{
          lazy: true, // Lazy load FSP simulation
        }}
      />
      <Stack.Screen
        name="kp"
        options={{
          lazy: true, // Lazy load KP simulation
        }}
      />
    </Stack>
  );
}