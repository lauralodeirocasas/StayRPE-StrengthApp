import { 
  StyleSheet, 
  Text, 
  TextInput, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons';
import { z } from "zod";

const registerSchema = z.object({
  username: z
    .string()
    .email("El correo electrónico no es válido")
    .min(1, "El correo electrónico es obligatorio"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(20, "La contraseña no puede exceder los 20 caracteres"),
  confirmPassword: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(20, "La contraseña no puede exceder los 20 caracteres"),
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "Los apellidos son obligatorios"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type RegisterErrors = {
  username?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  general?: string;
};

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const clearError = (field: keyof RegisterErrors) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleRegister = async () => {
    try {
      setIsLoading(true);
      setErrors({});
      
      registerSchema.parse({
        username,
        password,
        confirmPassword,
        firstName,
        lastName,
      });

      const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, firstName, lastName }),
      });

      const data = await res.json();

      if (data.error) {
        setErrors({ username: data.error });
        return;
      }

      const loginRes = await fetch(`${process.env.EXPO_PUBLIC_API_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const loginData = await loginRes.json();

      if (loginRes.ok && loginData.token) {
        await AsyncStorage.setItem("token", loginData.token);
        router.replace("/logueado");
      } else {
        Alert.alert("Error", "Error al iniciar sesión automáticamente. Por favor, inicia sesión manualmente.");
        router.replace("/");
      }

    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: RegisterErrors = {};
        err.errors.forEach(e => {
          newErrors[e.path[0] as keyof RegisterErrors] = e.message;
        });
        setErrors(newErrors);
      } else {
        console.error(err);
        Alert.alert("Error de conexión", "No se pudo conectar al servidor. Verifica tu conexión a internet.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="fitness" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.logoText}>StayRPE</Text>
            </View>
            
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.title}>¡Únete a StayRPE!</Text>
              <Text style={styles.subtitle}>Crea tu cuenta de atleta</Text>
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
                    clearError('username');
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

            <View style={styles.rowContainer}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <View style={[styles.inputWrapper, errors.firstName && styles.inputError]}>
                  <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Tu nombre"
                    placeholderTextColor="#9CA3AF"
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      clearError('firstName');
                    }}
                    autoComplete="given-name"
                  />
                </View>
                {errors.firstName && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#5E4B8B" />
                    <Text style={styles.errorText}>{errors.firstName}</Text>
                  </View>
                )}
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.inputLabel}>Apellidos</Text>
                <View style={[styles.inputWrapper, errors.lastName && styles.inputError]}>
                  <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Tus apellidos"
                    placeholderTextColor="#9CA3AF"
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      clearError('lastName');
                    }}
                    autoComplete="family-name"
                  />
                </View>
                {errors.lastName && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#5E4B8B" />
                    <Text style={styles.errorText}>{errors.lastName}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearError('password');
                  }}
                  autoComplete="new-password"
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

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirmar contraseña</Text>
              <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    clearError('confirmPassword');
                  }}
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#6B7280" 
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#5E4B8B" />
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton,
                { opacity: isLoading ? 0.7 : 1 }
              ]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.registerButtonText}>
                {isLoading ? "Creando cuenta..." : "Crear cuenta"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity 
              onPress={() => router.push("/")} 
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.loginText}>
                ¿Ya tienes cuenta? <Text style={styles.loginLink}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 32,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
    fontSize: 22,
    fontWeight: "800",
    color: "#5E4B8B",
    letterSpacing: 1,
  },
  welcomeTextContainer: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 26,
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
    marginBottom: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
  registerButton: {
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
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    alignItems: "center",
    paddingBottom: 20,
  },
  loginText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  loginLink: {
    color: "#5E4B8B",
    fontWeight: "600",
  },
});