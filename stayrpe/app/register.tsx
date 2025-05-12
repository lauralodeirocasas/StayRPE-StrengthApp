// app/register.tsx - Modificado

import { StyleSheet, Text, TextInput, View, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WaveHeader from "../components/WaveHeader";
import GradientButton from "../components/GradientButton";
import { z } from "zod";

// Definir el esquema de validación con Zod
const registerSchema = z.object({
  username: z
    .string()
    .email("El correo electrónico no es válido.")
    .min(1, "El correo electrónico es obligatorio."),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres.")
    .max(20, "La contraseña no puede exceder los 20 caracteres."),
  confirmPassword: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres.")
    .max(20, "La contraseña no puede exceder los 20 caracteres."),
  firstName: z.string().min(1, "El nombre es obligatorio."),
  lastName: z.string().min(1, "Los apellidos son obligatorios."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

// Tipado para los errores
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
  const [errors, setErrors] = useState<RegisterErrors>({}); // Tipado explícito
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    try {
      setIsLoading(true);
      
      // Validar formulario
      registerSchema.parse({
        username,
        password,
        confirmPassword,
        firstName,
        lastName,
      });

      console.log("Iniciando solicitud de registro...");
      const res = await fetch("http://192.168.0.57:8080/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, firstName, lastName }),
      });

      const data = await res.json();
      console.log("Respuesta del servidor:", data);

      if (data.error) {
        setErrors({ username: data.error });
        return;
      }

      console.log("Registro exitoso. Iniciando sesión...");
      const loginRes = await fetch("http://192.168.0.57:8080/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const loginData = await loginRes.json();
      console.log("Respuesta del login:", loginData);

      if (loginRes.ok && loginData.token) {
        await AsyncStorage.setItem("token", loginData.token);
        router.replace("/logueado");
      } else {
        setErrors({ general: "Error al iniciar sesión" });
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
        setErrors({ general: "No se pudo conectar al servidor" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoid}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <WaveHeader />
        <Text style={styles.title}>¡Bienvenido!</Text>
        <Text style={styles.subTitle}>Crea una cuenta nueva</Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
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
          placeholder="Nombre"
          value={firstName}
          onChangeText={(text) => {
            setFirstName(text);
            if (errors.firstName) setErrors({...errors, firstName: undefined});
          }}
        />
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Apellidos"
          value={lastName}
          onChangeText={(text) => {
            setLastName(text);
            if (errors.lastName) setErrors({...errors, lastName: undefined});
          }}
        />
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errors.password) setErrors({...errors, password: undefined});
          }}
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Repite la contraseña"
          secureTextEntry
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (errors.confirmPassword) setErrors({...errors, confirmPassword: undefined});
          }}
        />
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

        {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

        <TouchableOpacity onPress={() => router.push("/")} disabled={isLoading}>
          <Text style={styles.registerText}>¿Ya tienes cuenta? Inicia sesión</Text>
        </TouchableOpacity>

        <GradientButton
          title={isLoading ? "Registrando..." : "Registrarme"}
          onPress={handleRegister}
          style={{ width: 250, marginTop: 10 }}
          disabled={isLoading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#f1f1f1",
  },
  contentContainer: {
    alignItems: "center",
    paddingTop: 120,
    paddingBottom: 40,
  },
  title: {
    marginTop: 60,
    fontSize: 70,
    fontWeight: "bold",
    color: "#34434D",
    textAlign: "center",
  },
  subTitle: {
    fontSize: 20,
    color: "gray",
    textAlign: "center",
    marginBottom: 20,
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
    textAlign: "center",
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