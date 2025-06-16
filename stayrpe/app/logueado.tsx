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
          router.replace("/(tabs)/profile");
          return;
        }

        const response = await fetch("http://192.168.0.32:8080/user/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.onboardingComplete === true) {
            await AsyncStorage.setItem("onboardingComplete", "true");
            router.replace("/(tabs)/profile");
            return;
          }
        }

        router.replace("/onboarding/welcome");
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndOnboarding();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#5E4B8B" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});