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
import { Ionicons } from '@expo/vector-icons';

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
      description: "Menos de 6 meses de experiencia en entrenamiento estructurado",
      icon: "school",
      color: "#10B981",
      features: ["RPE básico", "Técnica fundamental", "Cargas moderadas"]
    },
    { 
      id: "intermediate", 
      label: "Intermedio", 
      description: "6 meses a 2 años de entrenamiento regular y estructurado",
      icon: "fitness",
      color: "#F59E0B",
      features: ["RPE avanzado", "Variaciones técnicas", "Periodización"]
    },
    { 
      id: "advanced", 
      label: "Avanzado", 
      description: "Más de 2 años de entrenamiento constante y especializado",
      icon: "trophy",
      color: "#EF4444",
      features: ["RPE experto", "Técnicas especializadas", "Auto-regulación"]
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
      
      const response = await fetch("http://192.168.0.32:8080/user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await AsyncStorage.setItem("onboardingComplete", "true");
        router.replace("/(tabs)/calendar");
      } else {
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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Experiencia</Text>
            <Text style={styles.headerSubtitle}>
              Define tu nivel de entrenamiento
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
            <Text style={styles.progressText}>3 de 3</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
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
                <View style={styles.levelContent}>
                  <Text style={[
                    styles.levelLabel, 
                    selectedLevel === level.id && styles.selectedText
                  ]}>
                    {level.label}
                  </Text>
                  <Text style={[
                    styles.levelDescription, 
                    selectedLevel === level.id && styles.selectedDescriptionText
                  ]}>
                    {level.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5E4B8B" />
            <Text style={styles.loadingText}>Guardando tu perfil...</Text>
            <Text style={styles.loadingSubtext}>Esto puede tomar unos segundos</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.button,
              { opacity: selectedLevel ? 1 : 0.6 }
            ]}
            onPress={handleFinish}
            disabled={!selectedLevel}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Completar configuración</Text>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D6CDE8',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D1B4E',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B5B95',
    fontWeight: '400',
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: '#EDE9FE',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5E4B8B',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  levelsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  levelCard: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedLevel: {
    backgroundColor: '#5E4B8B',
    borderColor: '#5936A2',
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  levelContent: {
    gap: 12,
  },
  levelLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  levelDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  selectedText: {
    color: '#FFFFFF',
  },
  selectedDescriptionText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 32,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#1F2937',
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5E4B8B',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
});