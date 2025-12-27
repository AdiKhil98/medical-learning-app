/**
 * Simulation Layout
 *
 * Layout for simulation screens (KP and FSP).
 */

import React from 'react';
import { Stack } from 'expo-router';

export default function SimulationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="fsp" />
      <Stack.Screen name="kp" />
    </Stack>
  );
}
