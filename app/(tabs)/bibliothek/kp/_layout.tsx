import React from 'react';
import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import BibliothekErrorBoundary from '@/components/BibliothekErrorBoundary';

export default function KPBibliothekLayout() {
  return (
    <ErrorBoundary>
      <BibliothekErrorBoundary fallbackTitle="KP Bibliothek konnte nicht geladen werden">
        <Stack
          screenOptions={{
            headerShown: true,
            headerStyle: { backgroundColor: '#F8F3E8' },
            headerTintColor: '#1F2937',
            headerTitleStyle: { fontFamily: 'Inter-Bold' as any },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="[slug]"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      </BibliothekErrorBoundary>
    </ErrorBoundary>
  );
}
