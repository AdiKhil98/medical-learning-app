import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import BibliothekErrorBoundary from '@/components/BibliothekErrorBoundary';
import TransitionBanner from '@/components/TransitionBanner';

export default function BibliothekLayout() {
  return (
    <ErrorBoundary>
      <BibliothekErrorBoundary fallbackTitle="Bibliothek konnte nicht geladen werden">
        <View style={{ flex: 1 }}>
          <TransitionBanner />
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
              name="haupt"
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
            <Stack.Screen
              name="[slug]"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="content/[slug]"
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
              name="audio"
              options={{
                headerShown: false,
              }}
            />
          </Stack>
        </View>
      </BibliothekErrorBoundary>
    </ErrorBoundary>
  );
}
