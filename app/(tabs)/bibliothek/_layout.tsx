import React from 'react';
import { Stack } from 'expo-router';

export default function BibliothekLayout() {
  return (
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
          headerTitle: '', // Will be set dynamically
        }}
      />
      <Stack.Screen
        name="content/[slug]"
        options={{
          headerTitle: '', // Will be set dynamically
        }}
      />
    </Stack>
  );
}