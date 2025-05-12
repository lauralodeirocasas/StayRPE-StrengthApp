// app/index.tsx - Modificado (pantalla de login)

import { StyleSheet, Text, TextInput, View, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WaveHeader from "../components/WaveHeader";
import GradientButton from "../components/GradientButton";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{username?: string; password?: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Redirección automática si el token ya existe
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          // Verificar si el onboarding está completo
          const onboardingComplete = await AsyncStorage.getItem("onboardingComplete");
          
          if (onboardingComplete === "true") {
            // Si el onboarding está completo, ir directamente al dashboard
            router.replace("/dashboard");
          } else {
            // Si no está completo, ir a la pantalla intermedia
            router.replace("/logueado");
          }
        }
      } catch (error) {
        console.error("Error al verificar login:", error);
      } finally {
        setInitialCheckDone(true);
      }
    };

    checkLogin();
  }, []);

  const validateForm = () => {
    const newErrors: {username?: string; password?: string} = {};
    let isValid = true;

    if (!username.trim()) {
      newErrors.username = "El correo electrónico es obligatorio";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "La contraseña es obligatoria";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    // Limpiar errores previos
    setErrors({});
    
    // Validar antes de enviar
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      const res = await fetch("http://192.168.0.57:8080/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        await AsyncStorage.setItem("token", data.token);
        
        // Verificar si necesita completar onboarding
        try {
          const profileRes = await fetch("http://192.168.0.57:8080/user/profile", {
            headers: {
              "Authorization": `Bearer ${data.token}`
            }
          });
          
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            
            if (profileData.onboardingComplete) {
              await AsyncStorage.setItem("onboardingComplete", "true");
              router.replace("/dashboard");
            } else {
              router.replace("/logueado");
            }
          } else {
            router.replace("/logueado");
          }
        } catch (error) {
          console.error("Error al verificar perfil:", error);
          router.replace("/logueado");
        }
      } else {
        Alert.alert("Error", data.error || "Credenciales incorrectas");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo conectar al servidor");
    } finally {
      setIsLoading(false);
    }
  };

  // Mientras se verifica el login inicial, mostrar pantalla de carga
  if (!initialCheckDone) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoid}
    >
      <View style={styles.container}>
        <WaveHeader />
        <Text style={styles.title}>Hello</Text>
        <Text style={styles.subTitle}>Sign In to your account</Text>

        <TextInput
          style={styles.input}
          placeholder="stayrpe@email.com"
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            if (errors.username) setErrors({...errors, username: undefined});
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry={true}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errors.password) setErrors({...errors, password: undefined});
          }}
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        <TouchableOpacity onPress={() => router.push("/register")} disabled={isLoading}>
          <Text style={styles.registerText}>¿Aún no tienes cuenta? Regístrate</Text>
        </TouchableOpacity>

        <GradientButton
          title={isLoading ? "Iniciando sesión..." : "Sign In"}
          onPress={handleLogin}
          style={{ width: 250, marginTop: 10 }}
          disabled={isLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    paddingTop: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  title: {
    fontSize: 80,
    fontWeight: "bold",
    color: "#34434D",
  },
  subTitle: {
    fontSize: 20,
    color: "gray",
  },
  input: {
    paddingStart: 30,
    padding: 10,
    width: "80%",
    height: 50,
    marginTop: 20,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  registerText: {
    marginTop: 30,
    fontSize: 14,
    color: "#3366cc",
    textDecorationLine: "underline",
  },
  button: {
    alignItems: "center",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 5,
    marginLeft: 40,
    textAlign: "left",
    width: "80%",
  },
});