// app/onboarding/_layout.tsx

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

export default function OnboardingLayout() {
  return (
    <View style={styles.container}>
      <Stack>
        <Stack.Screen name="welcome" options={{ 
          headerShown: false 
        }} />
        <Stack.Screen name="personal-data" options={{ 
          headerTitle: "Datos Personales",
          headerBackTitle: "Atrás",
          headerStyle: {
            backgroundColor: '#34434D',
          },
          headerTintColor: '#fff',
          headerShadowVisible: false,
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="fitness-goals" options={{ 
          headerTitle: "Tus Objetivos",
          headerBackTitle: "Atrás",
          headerStyle: {
            backgroundColor: '#34434D',
          },
          headerTintColor: '#fff',
          headerShadowVisible: false,
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="experience-level" options={{ 
          headerTitle: "Tu Experiencia",
          headerBackTitle: "Atrás",
          headerStyle: {
            backgroundColor: '#34434D',
          },
          headerTintColor: '#fff',
          headerShadowVisible: false,
          animation: 'slide_from_right',
        }} />
      </Stack>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f1f1',
  },
});