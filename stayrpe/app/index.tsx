import { 
  StyleSheet, 
  Text, 
  TextInput, 
  View, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{username?: string; password?: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          const onboardingComplete = await AsyncStorage.getItem("onboardingComplete");
          
          if (onboardingComplete === "true") {
            router.replace("/(tabs)/profile");
          } else {
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
    } else if (!/\S+@\S+\.\S+/.test(username)) {
      newErrors.username = "Introduce un email válido";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "La contraseña es obligatoria";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    setErrors({});
    
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
              router.replace("/(tabs)/profile");
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
        Alert.alert("Error de inicio de sesión", data.error || "Credenciales incorrectas");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error de conexión", "No se pudo conectar al servidor. Verifica tu conexión a internet.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!initialCheckDone) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="fitness" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>StayRPE</Text>
          </View>
          <ActivityIndicator size="large" color="#5E4B8B" />
          <Text style={styles.loadingText}>Verificando sesión...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="fitness" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.logoText}>StayRPE</Text>
            </View>
            
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.title}>¡Bienvenido de vuelta!</Text>
              <Text style={styles.subtitle}>Accede a tu cuenta para continuar</Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Correo electrónico</Text>
              <View style={[styles.inputWrapper, errors.username && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ejemplo@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    if (errors.username) setErrors({...errors, username: undefined});
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
              {errors.username && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#5E4B8B" />
                  <Text style={styles.errorText}>{errors.username}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Tu contraseña"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({...errors, password: undefined});
                  }}
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#6B7280" 
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#5E4B8B" />
                  <Text style={styles.errorText}>{errors.password}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                { opacity: isLoading ? 0.7 : 1 }
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.loginButtonText}>
                {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity 
              onPress={() => router.push("/register")} 
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.registerText}>
                ¿Aún no tienes cuenta? <Text style={styles.registerLink}>Regístrate</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
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
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: '500',
  },
  headerSection: {
    alignItems: "center",
    paddingTop: 60,
    marginBottom: -60
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#5E4B8B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#5E4B8B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#5E4B8B",
    letterSpacing: 1,
  },
  welcomeTextContainer: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2D1B4E",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "400",
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    gap: 20,
    shadowColor: "#5E4B8B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputError: {
    borderColor: '#5E4B8B',
    backgroundColor: 'white',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
  },
  passwordToggle: {
    padding: 4,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    color: '#5E4B8B',
    fontSize: 14,
    flex: 1,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5E4B8B',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    alignItems: "center",
    paddingBottom: 100,
    marginTop: -100
  },
  registerText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  registerLink: {
    color: "#5E4B8B",
    fontWeight: "600",
  },
});