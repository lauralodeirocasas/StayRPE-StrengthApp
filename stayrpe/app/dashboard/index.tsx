// app/dashboard/index.tsx

import { useState, useEffect } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  TouchableOpacity,
  RefreshControl
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GradientButton from "../../components/GradientButton";

// Tipado para el perfil del usuario
type UserProfile = {
  username: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  height?: number;
  weight?: number;
  fitnessGoal?: string;
  experienceLevel?: string;
  onboardingComplete: boolean;
};

export default function DashboardScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        router.replace("/");
        return;
      }
      
      const response = await fetch("http://192.168.0.57:8080/user/profile", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      } else {
        throw new Error("Error al obtener datos del usuario");
      }
    } catch (error) {
      console.error("Error al cargar el perfil:", error);
      Alert.alert(
        "Error", 
        "No se pudieron cargar tus datos. Por favor, inténtalo de nuevo."
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Verificar autenticación y obtener datos del perfil
    const loadProfile = async () => {
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
        
        // Obtener los datos del perfil
        await fetchUserProfile();
      } catch (error) {
        console.error("Error:", error);
        setIsLoading(false);
      }
    };
    
    loadProfile();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserProfile();
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "onboardingComplete"]);
      router.replace("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Formatear el objetivo para visualización
  const formatGoal = (goal?: string) => {
    if (!goal) return "No definido";
    
    switch (goal) {
      case "lose_weight": return "Perder peso";
      case "gain_muscle": return "Ganar músculo";
      case "improve_fitness": return "Mejorar condición física";
      case "maintain": return "Mantener estado actual";
      default: return goal;
    }
  };

  // Formatear el nivel de experiencia para visualización
  const formatExperience = (level?: string) => {
    if (!level) return "No definido";
    
    switch (level) {
      case "beginner": return "Principiante";
      case "intermediate": return "Intermedio";
      case "advanced": return "Avanzado";
      default: return level;
    }
  };

  // Calcular el IMC
  const calculateBMI = () => {
    if (!userProfile?.height || !userProfile?.weight) return null;
    
    const heightInMeters = userProfile.height / 100;
    const bmi = userProfile.weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };
  
  // Obtener categoría de IMC
  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return { label: "Bajo peso", color: "#3498db" };
    if (bmi < 25) return { label: "Peso normal", color: "#2ecc71" };
    if (bmi < 30) return { label: "Sobrepeso", color: "#f39c12" };
    return { label: "Obesidad", color: "#e74c3c" };
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3366cc" />
        <Text style={styles.loadingText}>Cargando tus datos...</Text>
      </View>
    );
  }

  // Calcular IMC si hay datos
  const bmi = calculateBMI();
  const bmiCategory = bmi ? getBmiCategory(parseFloat(bmi)) : null;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#3366cc"]}
        />
      }
    >
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>
          Hola, {userProfile?.firstName || userProfile?.username || "Usuario"}
        </Text>
        <Text style={styles.welcomeSubtext}>
          Bienvenido a tu dashboard de entrenamiento
        </Text>
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Tus estadísticas</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{userProfile?.age || "--"}</Text>
            <Text style={styles.statLabel}>Edad</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{userProfile?.height || "--"}</Text>
            <Text style={styles.statLabel}>Altura (cm)</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{userProfile?.weight || "--"}</Text>
            <Text style={styles.statLabel}>Peso (kg)</Text>
          </View>
        </View>
      </View>
      
      {bmi && (
        <View style={styles.bmiContainer}>
          <Text style={styles.sectionTitle}>Tu IMC</Text>
          <View style={styles.bmiCard}>
            <Text style={styles.bmiValue}>{bmi}</Text>
            <Text style={[styles.bmiCategory, { color: bmiCategory?.color }]}>
              {bmiCategory?.label}
            </Text>
            <Text style={styles.bmiDescription}>
              El Índice de Masa Corporal (IMC) es una medida que relaciona tu peso con tu altura.
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>Tu perfil</Text>
        
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Objetivo actual:</Text>
            <Text style={styles.profileValue}>
              {formatGoal(userProfile?.fitnessGoal)}
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Nivel de experiencia:</Text>
            <Text style={styles.profileValue}>
              {formatExperience(userProfile?.experienceLevel)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => router.push("/onboarding/personal-data")}
        >
          <Text style={styles.editButtonText}>Editar perfil</Text>
        </TouchableOpacity>
        
        <GradientButton
          title="Cerrar sesión"
          onPress={handleLogout}
          style={styles.logoutButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f1f1",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  welcomeSection: {
    padding: 20,
    backgroundColor: "#34434D",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  welcomeSubtext: {
    fontSize: 16,
    color: "#ccc",
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34434D",
    marginBottom: 15,
  },
  statsContainer: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    width: "31%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#3366cc",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  bmiContainer: {
    padding: 20,
    paddingTop: 0,
  },
  bmiCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bmiValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#3366cc",
  },
  bmiCategory: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 5,
    marginBottom: 15,
  },
  bmiDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  profileSection: {
    padding: 20,
    paddingTop: 0,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  profileLabel: {
    fontSize: 16,
    color: "#666",
  },
  profileValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#34434D",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 5,
  },
  actionsContainer: {
    padding: 20,
    alignItems: "center",
  },
  editButton: {
    paddingVertical: 12,
    marginBottom: 15,
  },
  editButtonText: {
    fontSize: 16,
    color: "#3366cc",
    textDecorationLine: "underline",
  },
  logoutButton: {
    width: 200,
  }
});