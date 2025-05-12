// app/dashboard/_layout.tsx

import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function DashboardLayout() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar autenticación
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        
        if (!token) {
          // Si no hay token, redirigir al login
          router.replace("/");
          return;
        }
        
        // Verificar si el onboarding está completo
        const onboardingComplete = await AsyncStorage.getItem("onboardingComplete");
        
        if (onboardingComplete !== "true") {
          // Si el onboarding no está completo, redirigir
          router.replace("/onboarding/welcome");
          return;
        }
        
        // Obtener nombre de usuario para mostrar en header
        const response = await fetch("http://192.168.0.57:8080/user/profile", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserName(data.firstName || data.username);
        }
      } catch (error) {
        console.error("Error en DashboardLayout:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Manejar cierre de sesión
  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "onboardingComplete"]);
      router.replace("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3366cc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#34434D',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: () => (
            <TouchableOpacity 
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
          ),
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            headerTitle: `GymTracker${userName ? ` - ${userName}` : ''}`,
          }} 
        />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
  },
  logoutButton: {
    marginRight: 15,
    padding: 5,
  },
});