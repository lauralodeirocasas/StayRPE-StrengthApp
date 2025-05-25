
// ==================== EXPERIENCE LEVEL SCREEN ====================
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
import AsyncStorage from "@react-native-async-storage/async-storage";

type Experience = "beginner" | "intermediate" | "advanced";

export default function ExperienceLevelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    age: string; 
    height: string; 
    weight: string;
    goal: string;
    sex: string;
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
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        Alert.alert("Error", "No se encontró un token de autenticación. Por favor, inicia sesión de nuevo.");
        router.replace("/");
        return;
      }
      
      const profileData = {
        age: parseInt(params.age || "0"),
        height: parseInt(params.height || "0"),
        weight: parseInt(params.weight || "0"),
        sex: params.sex || "",
        fitnessGoal: params.goal,
        experienceLevel: selectedLevel
      };
      
      console.log("Enviando datos de perfil:", profileData);
      
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
        await AsyncStorage.setItem("onboardingComplete", "true");
        router.replace("/(tabs)");
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
    <SafeAreaView style={experienceStyles.container}>
      <ScrollView contentContainerStyle={experienceStyles.scrollContent}>
        <View style={experienceStyles.content}>
          <Text style={experienceStyles.title}>Nivel de Experiencia</Text>
          
          <Text style={experienceStyles.description}>
            ¿Cuál es tu nivel de experiencia en entrenamiento?
          </Text>

          <View style={experienceStyles.levelsContainer}>
            {experienceLevels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  experienceStyles.levelCard,
                  selectedLevel === level.id && experienceStyles.selectedLevel,
                ]}
                onPress={() => setSelectedLevel(level.id as Experience)}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Text style={[experienceStyles.levelLabel, selectedLevel === level.id && experienceStyles.selectedText]}>
                  {level.label}
                </Text>
                <Text style={[experienceStyles.levelDescription, selectedLevel === level.id && experienceStyles.selectedDescriptionText]}>
                  {level.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <View style={experienceStyles.loadingContainer}>
              <ActivityIndicator size="large" color="#5E4B8B" />
              <Text style={experienceStyles.loadingText}>Guardando tu perfil...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                experienceStyles.button,
                { opacity: selectedLevel ? 1 : 0.5 }
              ]}
              onPress={handleFinish}
              disabled={!selectedLevel}
              activeOpacity={0.8}
            >
              <Text style={experienceStyles.buttonText}>Finalizar</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const experienceStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f5fc",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#5E4B8B",
    marginTop: 20,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#7D7A8C",
    marginBottom: 30,
  },
  levelsContainer: {
    marginBottom: 30,
  },
  levelCard: {
    backgroundColor: "#F3F0FF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: "#DCD6F7",
    shadowColor: "#B793F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedLevel: {
    backgroundColor: "#5E4B8B",
    borderColor: "#5936A2",
    shadowColor: "#5936A2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  levelLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5E4B8B",
    marginBottom: 8,
  },
  levelDescription: {
    fontSize: 14,
    color: "#7D7A8C",
    lineHeight: 20,
  },
  selectedText: {
    color: "#fff",
  },
  selectedDescriptionText: {
    color: "#E6E1FF",
  },
  loadingContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#7D7A8C",
  },
  button: {
    width: "100%",
    backgroundColor: "#5E4B8B",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#8B63D7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: 1,
  },
});