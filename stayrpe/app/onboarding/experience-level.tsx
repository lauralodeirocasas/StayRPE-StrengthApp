// app/onboarding/experience-level.tsx

import { useState } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  ActivityIndicator,
  Alert 
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import GradientButton from "../../components/GradientButton";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Experience = "beginner" | "intermediate" | "advanced";

export default function ExperienceLevelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    age: string; 
    height: string; 
    weight: string;
    goal: string;
  }>();
  
  const [selectedLevel, setSelectedLevel] = useState<Experience | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const experienceLevels = [
    { 
      id: "beginner", 
      label: "Principiante", 
      description: "Nuevo en el entrenamiento o retomando después de un largo descanso" 
    },
    { 
      id: "intermediate", 
      label: "Intermedio", 
      description: "Entreno regularmente desde hace algunos meses" 
    },
    { 
      id: "advanced", 
      label: "Avanzado", 
      description: "Entreno constantemente desde hace más de un año" 
    },
  ];

  const handleFinish = async () => {
    if (!selectedLevel) return;
    
    setIsLoading(true);
    
    try {
      // Obtener el token de autenticación
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        Alert.alert("Error", "No se encontró un token de autenticación. Por favor, inicia sesión de nuevo.");
        router.replace("/");
        return;
      }
      
      // Preparar los datos para el perfil
      const profileData = {
        age: parseInt(params.age || "0"),
        height: parseInt(params.height || "0"),
        weight: parseInt(params.weight || "0"),
        fitnessGoal: params.goal,
        experienceLevel: selectedLevel
      };
      
      console.log("Enviando datos de perfil:", profileData);
      
      // Enviar los datos al backend
      const response = await fetch("http://192.168.0.57:8080/user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log("Perfil guardado exitosamente:", data);
        
        // Marcar que el onboarding está completo
        await AsyncStorage.setItem("onboardingComplete", "true");
        
        // Redirigir al dashboard
        router.replace("/dashboard");
      } else {
        console.error("Error al guardar perfil:", data);
        Alert.alert("Error", data.error || "Hubo un problema al guardar tu perfil. Inténtalo de nuevo.");
      }
    } catch (error) {
      console.error("Error al guardar el perfil:", error);
      Alert.alert(
        "Error de conexión", 
        "No se pudo conectar con el servidor. Verifica tu conexión a internet."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Nivel de Experiencia</Text>
          
          <Text style={styles.description}>
            ¿Cuál es tu nivel de experiencia en entrenamiento?
          </Text>

          <View style={styles.levelsContainer}>
            {experienceLevels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.levelCard,
                  selectedLevel === level.id && styles.selectedLevel,
                ]}
                onPress={() => setSelectedLevel(level.id as Experience)}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Text style={[styles.levelLabel, selectedLevel === level.id && styles.selectedText]}>
                  {level.label}
                </Text>
                <Text style={styles.levelDescription}>
                  {level.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3366cc" />
              <Text style={styles.loadingText}>Guardando tu perfil...</Text>
            </View>
          ) : (
            <GradientButton
              title="Finalizar"
              onPress={handleFinish}
              disabled={!selectedLevel}
              style={[
                styles.button,
                { opacity: selectedLevel ? 1 : 0.5 }
              ]}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f1f1",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#34434D",
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },
  levelsContainer: {
    marginBottom: 30,
  },
  levelCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedLevel: {
    borderColor: "#3366cc",
    backgroundColor: "#e6efff",
  },
  levelLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34434D",
    marginBottom: 5,
  },
  levelDescription: {
    fontSize: 14,
    color: "#666",
  },
  selectedText: {
    color: "#3366cc",
  },
  loadingContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  button: {
    width: "100%",
    marginBottom: 20,
  },
});