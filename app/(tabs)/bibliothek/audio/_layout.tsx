import React from 'react';
import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AudioLayout() {
  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: '#F8F3E8' },
          headerTintColor: '#1F2937',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="fsp"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="kp"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </ErrorBoundary>
  );
}
