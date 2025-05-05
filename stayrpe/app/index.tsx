import { StyleSheet, Text, TextInput, View, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WaveHeader from "../components/WaveHeader";
import GradientButton from "../components/GradientButton";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Redirección automática si el token ya existe
  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        router.replace("/logueado"); // Evita volver atrás
      }
    };

    checkLogin();
  }, []);

  const handleLogin = async () => {
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
        router.replace("/logueado");
      } else {
        Alert.alert("Error", data.error || "Credenciales incorrectas");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo conectar al servidor");
    }
  };

  return (
    <View style={styles.container}>
      <WaveHeader />
      <Text style={styles.title}>Hello</Text>
      <Text style={styles.subTitle}>Sign In to your account</Text>

      <TextInput
        style={styles.input}
        placeholder="stayrpe@email.com"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry={true}
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity onPress={() => router.push("/register")}>
        <Text style={styles.registerText}>¿Aún no tienes cuenta? Regístrate</Text>
      </TouchableOpacity>

      <GradientButton
        title="Sign In"
        onPress={handleLogin}
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
});
