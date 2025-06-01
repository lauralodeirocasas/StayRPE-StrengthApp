import { useState } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  TouchableOpacity 
} from "react-native";
import { useRouter } from "expo-router";
import GradientButton from "../../components/GradientButton";

type SexOption = "male" | "female" | "other";

type Errors = {
  age?: string;
  height?: string;
  weight?: string;
  sex?: string;
};

const SEX_OPTIONS = [
  { label: "Masculino", value: "male" as SexOption },
  { label: "Femenino", value: "female" as SexOption },
  { label: "Otro", value: "other" as SexOption },
];

export default function PersonalDataScreen() {
  const router = useRouter();
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [sex, setSex] = useState<SexOption | "">("");
  const [errors, setErrors] = useState<Errors>({});

  const validateForm = (): boolean => {
    const newErrors: Errors = {};
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

    // Validar sexo
    if (!sex) {
      newErrors.sex = "El sexo es obligatorio";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const clearError = (field: keyof Errors) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleContinue = () => {
    if (validateForm()) {
      router.push({
        pathname: "/onboarding/fitness-goals",
        params: { age, height, weight, sex },
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
              {/* Edad */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Edad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Años"
                  keyboardType="numeric"
                  value={age}
                  onChangeText={(text) => {
                    setAge(text);
                    clearError('age');
                  }}
                />
                {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
              </View>

              {/* Altura */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Altura</Text>
                <TextInput
                  style={styles.input}
                  placeholder="cm"
                  keyboardType="numeric"
                  value={height}
                  onChangeText={(text) => {
                    setHeight(text);
                    clearError('height');
                  }}
                />
                {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
              </View>

              {/* Peso */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Peso</Text>
                <TextInput
                  style={styles.input}
                  placeholder="kg"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={(text) => {
                    setWeight(text);
                    clearError('weight');
                  }}
                />
                {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
              </View>

              {/* Sexo */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Sexo</Text>
                <View style={styles.sexOptionsContainer}>
                  {SEX_OPTIONS.map(({ label, value }) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.sexOption,
                        sex === value && styles.sexOptionSelected,
                      ]}
                      onPress={() => {
                        setSex(value);
                        clearError('sex');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.sexOptionText,
                          sex === value && styles.sexOptionTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.sex && <Text style={styles.errorText}>{errors.sex}</Text>}
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
  sexOptionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  sexOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  sexOptionSelected: {
    borderColor: "#3366cc",
    backgroundColor: "#e6efff",
  },
  sexOptionText: {
    fontSize: 14,
    color: "#34434D",
    fontWeight: "500",
  },
  sexOptionTextSelected: {
    color: "#3366cc",
    fontWeight: "600",
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