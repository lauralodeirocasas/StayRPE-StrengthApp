import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleContinue = () => {
    router.push("/onboarding/personal-data");
  };

  const LogoComponent = () => (
    <View style={styles.logoContainer}>
      <View style={styles.logoCircle}>
        <Ionicons name="fitness" size={48} color="#FFFFFF" />
      </View>
      <Text style={styles.logoText}>StayRPE</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>¡Bienvenido a StayRPE!</Text>
          <Text style={styles.subtitle}>Organiza y planifica tu entrenamiento</Text>
        </View>
        
        <LogoComponent />
        
        <View style={styles.descriptionSection}>
          <Text style={styles.description}>
            Antes de comenzar, necesitamos algunos datos básicos para configurar tu perfil de atleta.
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#5E4B8B" />
              <Text style={styles.featureText}>Tracking de entrenamientos</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#5E4B8B" />
              <Text style={styles.featureText}>Organización de rutinas</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#5E4B8B" />
              <Text style={styles.featureText}>Planificación de macrociclos</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleContinue} 
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Comenzar</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2D1B4E",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "400",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#5E4B8B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#5E4B8B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#5E4B8B",
    letterSpacing: 2,
  },
  descriptionSection: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  description: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresList: {
    gap: 12,
    alignItems: "flex-start",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5E4B8B",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    minWidth: 200,
    shadowColor: "#5E4B8B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 18,
  },
});