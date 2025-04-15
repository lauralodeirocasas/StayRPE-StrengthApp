import { View, Text, StyleSheet, Button } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function Logueado() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Logueado</Text>
      <Button title="Cerrar sesión" onPress={handleLogout} />
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
  text: {
    fontSize: 20,
    marginBottom: 20,
  },
});
