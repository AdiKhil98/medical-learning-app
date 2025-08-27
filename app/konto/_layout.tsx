import React from 'react';
import { Stack } from 'expo-router';

export default function KontoLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="datenschutz-agb" />
      <Stack.Screen name="persoenliche-daten" />
      <Stack.Screen name="passwort-aendern" />
    </Stack>
  );
}