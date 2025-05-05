import { StyleSheet, Text, TextInput, View, TouchableOpacity, Alert } from "react-native";
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
  firstName: z
    .string()
    .min(1, "El nombre es obligatorio."),
  lastName: z
    .string()
    .min(1, "Los apellidos son obligatorios."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleRegister = async () => {
    try {
      console.log("Iniciando solicitud de registro...");

      // Validar los datos del formulario con Zod
      registerSchema.parse({
        username,
        password,
        confirmPassword,
        firstName,
        lastName,
      });

      // Enviar solicitud de registro al servidor
      const res = await fetch("http://192.168.0.57:8080/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, firstName, lastName }),
      });

      let data = {};
      try {
        data = await res.json(); // Intentar obtener la respuesta JSON
        console.log("Respuesta del servidor:", data);
      } catch (error) {
        console.error("Error al procesar la respuesta JSON:", error);
        Alert.alert("Error", "Hubo un problema al procesar la respuesta del servidor.");
        return;
      }

      // Verificar si la respuesta contiene un error
      if (data.error) {
        // Si hay un error (como el nombre de usuario ya existe), mostrar alerta
        console.log("Error en el registro:", data.error);
        Alert.alert("Error", data.error); // Mostrar mensaje de error
        return;
      }

      // Si el registro fue exitoso, proceder con el login
      console.log("Registro exitoso. Iniciando sesión...");
      const loginRes = await fetch("http://192.168.0.57:8080/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      let loginData = {};
      try {
        loginData = await loginRes.json();
        console.log("Respuesta del login:", loginData);
      } catch (error) {
        console.error("Error al parsear la respuesta del login:", error);
        Alert.alert("Error", "Hubo un problema al procesar la respuesta del login.");
        return;
      }

      if (loginRes.ok && loginData.token) {
        console.log("Login exitoso, token recibido.");
        // Guardar el token en AsyncStorage
        await AsyncStorage.setItem("token", loginData.token);
        // Redirigir al usuario a la pantalla principal
        router.replace("/logueado");
      } else {
        console.log("Error al iniciar sesión:", loginData.error);
        Alert.alert("Error", loginData.error || "Error al iniciar sesión");
      }
    } catch (err) {
      console.error("Error en la solicitud:", err);
      Alert.alert("Error", "No se pudo conectar al servidor");
    }
  };

  return (
    <View style={styles.container}>
      <WaveHeader />
      <Text style={styles.title}>¡Bienvenido!</Text>
      <Text style={styles.subTitle}>Crea una cuenta nueva</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry={true}
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Repite la contraseña"
        secureTextEntry={true}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Nombre"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={styles.input}
        placeholder="Apellidos"
        value={lastName}
        onChangeText={setLastName}
      />

      <TouchableOpacity onPress={() => router.push("/")}>
        <Text style={styles.registerText}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>

      <GradientButton
        title="Registrarme"
        onPress={handleRegister}
        style={{ width: "250", marginTop: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    paddingTop: 120,
  },
  title: {
    fontSize: 70,
    fontWeight: "bold",
    color: "#34434D",
    textAlign: "center",
  },
  subTitle: {
    fontSize: 20,
    color: "gray",
    textAlign: "center",
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
});
