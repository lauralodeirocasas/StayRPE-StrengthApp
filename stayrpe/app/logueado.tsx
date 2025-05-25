// app/logueado.tsx

import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function Logueado() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          router.replace("/");
          return;
        }

        const onboardingComplete = await AsyncStorage.getItem("onboardingComplete");
        if (onboardingComplete === "true") {
          router.replace("/(tabs)");
          return;
        }

        // Si no está completo local, consultamos backend
        const response = await fetch("http://192.168.0.57:8080/user/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.onboardingComplete === true) {
            await AsyncStorage.setItem("onboardingComplete", "true");
            router.replace("/(tabs)");
            return;
          }
        }

        // Si no está completo o hubo error, vamos a onboarding
        router.replace("/onboarding/welcome");
      } catch {
        // En caso de error, volvemos a login para evitar bloqueo
        router.replace("/");
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndOnboarding();
  }, []);

  // Mientras verifica, mostramos un loader centrado
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // No mostramos nada más, porque siempre redirige
  return null;
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
