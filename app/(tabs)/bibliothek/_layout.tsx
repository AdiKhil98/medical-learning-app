import React from 'react';
import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import BibliothekErrorBoundary from '@/components/BibliothekErrorBoundary';

export default function BibliothekLayout() {
  return (
    <ErrorBoundary>
      <BibliothekErrorBoundary fallbackTitle="Bibliothek konnte nicht geladen werden">
        <Stack
          screenOptions={{
            headerShown: true,
            headerStyle: { backgroundColor: '#F8F3E8' }, // White Linen background
            headerTintColor: '#1F2937',
            headerTitleStyle: { fontFamily: 'Inter-Bold' as any },
            // Enable lazy loading for content screens
            lazy: true,
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false, // hide header on root list
              lazy: false, // Keep index eager-loaded as it's the entry point
            }}
          />
          <Stack.Screen
            name="[slug]"
            options={{
              headerShown: false, // Hide header, using custom back button instead
              lazy: true, // Lazy load category screens
            }}
          />
          <Stack.Screen
            name="content/[slug]"
            options={{
              headerShown: false, // Hide header, using custom back button instead
              lazy: true, // Lazy load content detail screens
            }}
          />
        </Stack>
      </BibliothekErrorBoundary>
    </ErrorBoundary>
  );
}