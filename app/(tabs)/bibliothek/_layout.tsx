import React from 'react';
import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function BibliothekLayout() {
  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#F8F3E8' }, // White Linen background
          headerTintColor: '#1F2937',
          headerTitleStyle: { fontFamily: 'Inter-Bold' as any },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false, // hide header on root list
          }}
        />
        <Stack.Screen
          name="[slug]"
          options={{
            headerShown: false, // Hide header, using custom back button instead
          }}
        />
        <Stack.Screen
          name="content/[slug]"
          options={{
            headerShown: false, // Hide header, using custom back button instead
          }}
        />
      </Stack>
    </ErrorBoundary>
  );
}