import { StyleSheet, Text, View, SafeAreaView, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function WelcomeScreen() {
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleContinue = () => {
    router.push("/onboarding/personal-data");
  };

  // Logo SVG como componente (más rápido que imagen)
  const LogoComponent = () => (
    <View style={styles.logoContainer}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>StayRPE</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>¡Bienvenido a StayRPE!</Text>
        
        {/* Opción 1: Logo como componente (más rápido) */}
        <LogoComponent />
        
        {/* Opción 2: Imagen con fallback y optimización 
        {!imageError ? (
          <Image 
            source={require('../../assets/images/stayrpe_logo.png')}
            style={[styles.image, { opacity: imageLoaded ? 1 : 0.3 }]}
            resizeMode="contain"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <LogoComponent />
        )}
        */}
        
        <Text style={styles.description}>
          Antes de comenzar, necesitamos algunos datos para personalizar tu experiencia.
        </Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleContinue} 
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f5fc",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#5E4B8B",
    marginBottom: 30,
    textAlign: "center",
  },
  // Logo como componente (opción más rápida)
  logoContainer: {
    marginBottom: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  logoCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#5E4B8B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8B63D7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff9db",
    letterSpacing: 2,
  },
  // Estilos para imagen (si decides usarla)
  image: {
    width: 200, // Tamaño fijo más pequeño
    height: 150, // Tamaño fijo más pequeño
    marginBottom: 30,
  },
  description: {
    fontSize: 16,
    color: "#7D7A8C",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  button: {
    width: 250,
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
    color: "#fff9db",
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: 1,
  },
});