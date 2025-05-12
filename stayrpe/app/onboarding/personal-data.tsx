// app/onboarding/personal-data.tsx

import { useState } from "react";
import { StyleSheet, Text, View, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import GradientButton from "../../components/GradientButton";

export default function PersonalDataScreen() {
  const router = useRouter();
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [errors, setErrors] = useState<{
    age?: string;
    height?: string;
    weight?: string;
  }>({});

  const validateForm = () => {
    const newErrors: {
      age?: string;
      height?: string;
      weight?: string;
    } = {};
    let isValid = true;

    // Validar edad
    if (!age.trim()) {
      newErrors.age = "La edad es obligatoria";
      isValid = false;
    } else if (isNaN(Number(age)) || Number(age) <= 0 || Number(age) > 120) {
      newErrors.age = "Introduce una edad válida (1-120)";
      isValid = false;
    }

    // Validar altura
    if (!height.trim()) {
      newErrors.height = "La altura es obligatoria";
      isValid = false;
    } else if (isNaN(Number(height)) || Number(height) <= 0 || Number(height) > 300) {
      newErrors.height = "Introduce una altura válida en cm (1-300)";
      isValid = false;
    }

    // Validar peso
    if (!weight.trim()) {
      newErrors.weight = "El peso es obligatorio";
      isValid = false;
    } else if (isNaN(Number(weight)) || Number(weight) <= 0 || Number(weight) > 500) {
      newErrors.weight = "Introduce un peso válido en kg (1-500)";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleContinue = () => {
    if (validateForm()) {
      router.push({
        pathname: "/onboarding/fitness-goals",
        params: { age, height, weight }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>Datos Personales</Text>
            
            <Text style={styles.description}>
              Esta información nos ayudará a personalizar tu plan de entrenamiento.
            </Text>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Edad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Años"
                  keyboardType="numeric"
                  value={age}
                  onChangeText={(text) => {
                    setAge(text);
                    if (errors.age) {
                      setErrors({ ...errors, age: undefined });
                    }
                  }}
                />
                {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Altura</Text>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  keyboardType="numeric"
                  value={height}
                  onChangeText={(text) => {
                    setHeight(text);
                    if (errors.height) {
                      setErrors({ ...errors, height: undefined });
                    }
                  }}
                />
                {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Peso</Text>
                <TextInput
                  style={styles.input}
                  placeholder="kg"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={(text) => {
                    setWeight(text);
                    if (errors.weight) {
                      setErrors({ ...errors, weight: undefined });
                    }
                  }}
                />
                {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
              </View>
            </View>

            <GradientButton
              title="Continuar"
              onPress={handleContinue}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f1f1",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#34434D",
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#34434D",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    width: "100%",
    marginTop: 20,
  },
});