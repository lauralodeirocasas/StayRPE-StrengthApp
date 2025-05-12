// app/onboarding/welcome.tsx

import { StyleSheet, Text, View, SafeAreaView, Image } from "react-native";
import { useRouter } from "expo-router";
import GradientButton from "../../components/GradientButton";

export default function WelcomeScreen() {
  const router = useRouter();

  const handleContinue = () => {
    router.push("/onboarding/personal-data");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>¡Bienvenido a GymTracker!</Text>
        
        <Image 
          source={require('../../assets/images/welcome-fitness.png')} 
          style={styles.image}
          resizeMode="contain"
        />
        
        <Text style={styles.description}>
          Antes de comenzar, necesitamos algunos datos para personalizar tu experiencia.
          Esto nos ayudará a crear un plan de entrenamiento adaptado a tus necesidades.
        </Text>
        
        <GradientButton
          title="Continuar"
          onPress={handleContinue}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f1f1",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#34434D",
    marginBottom: 30,
    textAlign: "center",
  },
  image: {
    width: "80%",
    height: 200,
    marginBottom: 30,
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    width: 250,
  },
});