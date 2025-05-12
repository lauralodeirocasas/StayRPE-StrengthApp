// app/logueado.tsx - Modificado

import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import GradientButton from "../components/GradientButton";

export default function Logueado() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        // Verificar si existe un token
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          router.replace("/");
          return;
        }

        // Verificar si el onboarding está completo
        const onboardingComplete = await AsyncStorage.getItem("onboardingComplete");
        
        if (onboardingComplete === "true") {
          // Si el onboarding está completo, ir al dashboard
          router.replace("/dashboard");
          return;
        }
        
        // Comprobar con el backend si tiene perfil
        const response = await fetch("http://192.168.0.57:8080/user/profile", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.onboardingComplete) {
            // Si el backend dice que el onboarding está completo, actualizar localStorage
            await AsyncStorage.setItem("onboardingComplete", "true");
            router.replace("/dashboard");
            return;
          }
        }
        
        // Si llegamos aquí, el onboarding no está completo
        setIsLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setError("No se pudo conectar con el servidor. Verifica tu conexión a internet.");
        setIsLoading(false);
      }
    };

    checkOnboarding();
  }, []);

  const handleStartOnboarding = async () => {
    router.push("/onboarding/welcome");
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    router.replace("/");
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3366cc" />
        <Text style={styles.loadingText}>Verificando estado...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Bienvenido a GymTracker!</Text>
      
      <Image 
        source={require('../assets/images/fitness-profile.png')} 
        style={styles.image}
        resizeMode="contain"
      />
      
      <Text style={styles.description}>
        Para continuar, necesitamos que completes tu perfil con algunos datos básicos que nos ayudarán a personalizar tu experiencia de entrenamiento.
      </Text>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <GradientButton
        title="Completar mi perfil"
        onPress={handleStartOnboarding}
        style={styles.button}
      />
      
      <Text style={styles.orText}>o</Text>
      
      <GradientButton
        title="Cerrar sesión"
        onPress={handleLogout}
        style={[styles.button, styles.logoutButton]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#34434D",
    marginBottom: 20,
    textAlign: "center",
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    width: 250,
    marginBottom: 15,
  },
  logoutButton: {
    backgroundColor: "#f44336",
  },
  orText: {
    fontSize: 16,
    color: "#666",
    marginVertical: 10,
  },
});