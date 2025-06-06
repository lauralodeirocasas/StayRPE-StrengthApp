import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, Alert, Image, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const confirmarLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, cerrar sesión",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("token");
              await AsyncStorage.removeItem("onboardingComplete");
              await AsyncStorage.removeItem("userProfile");
              
              console.log('✅ Sesión cerrada correctamente');
              
              router.push("/")
            } catch (error) {
              console.error('❌ Error al cerrar sesión:', error);
              Alert.alert('Error', 'No se pudo cerrar la sesión correctamente');
            }
          },
        },
      ]
    );
  };

  const LogoutButton = () => (
    <Pressable
      onPress={confirmarLogout}
      style={{ marginRight: 15 }}
    >
      {({ pressed }) => (
        <Ionicons
          name="log-out-outline"
          color="#5E4B8B"
          size={24}
          style={{ opacity: pressed ? 0.5 : 1 }}
        />
      )}
    </Pressable>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
      }}>
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendario',
          headerRight: () => <LogoutButton />,
          headerTitleStyle: {
            color: '#5E4B8B',
            fontWeight: 'bold',
            fontSize: 20,
          },
          headerStyle: {
            backgroundColor: '#fff',
          },
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={"#5E4B8B"} />,
        }}
      />
      
      <Tabs.Screen
        name="macrocycle"
        options={{
          title: 'Macrociclo',
          headerTitleStyle: {
            color: '#5E4B8B',
            fontWeight: 'bold',
            fontSize: 20,
          },
          headerRight: () => <LogoutButton />,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={"#5E4B8B"} />,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Rutinas',
          headerRight: () => <LogoutButton />,
          headerTitleStyle: {
            color: '#5E4B8B',
            fontWeight: 'bold',
            fontSize: 20,
          },
          headerStyle: {
            backgroundColor: '#fff',
          },
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={"#5E4B8B"} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          headerRight: () => <LogoutButton />,
          headerTitleStyle: {
            color: '#5E4B8B',
            fontWeight: 'bold',
            fontSize: 20,
          },
          headerStyle: {
            backgroundColor: '#fff',
          },
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person" color={"#5E4B8B"} />,
        }}
      />
    </Tabs>
  );
}