import { Stack } from 'expo-router';

export default function FSPLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="bibliothek" />
    </Stack>
  );
}
