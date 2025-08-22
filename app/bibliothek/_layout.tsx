import { Stack } from 'expo-router';

export default function BibliothekLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[slug]" />
      <Stack.Screen name="anatomie-herz" />
      <Stack.Screen name="ekg-grundlagen" />
      <Stack.Screen name="bildgebung-thorax" />
      <Stack.Screen name="sono-abdomen" />
    </Stack>
  );
}