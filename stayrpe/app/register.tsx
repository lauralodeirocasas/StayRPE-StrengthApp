import { StyleSheet, Text, TextInput, View, TouchableOpacity } from "react-native";
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

  const handleRegister = async () => {
    try {
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
        setUsername('');
        setPassword('');
        setConfirmPassword('');
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
      {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Repite la contraseña"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Nombre"
        value={firstName}
        onChangeText={setFirstName}
      />
      {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Apellidos"
        value={lastName}
        onChangeText={setLastName}
      />
      {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

      {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

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
