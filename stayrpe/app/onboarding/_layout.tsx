// app/onboarding/_layout.tsx

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function OnboardingLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,  // Oculta el header por defecto
        }}
      >
        <Stack.Screen name="welcome" />
        <Stack.Screen 
          name="personal-data" 
          options={{
            headerShown: false, // Mostrar header solo en esta pantalla
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="fitness-goals" 
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="experience-level" 
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
