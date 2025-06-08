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
import { Ionicons } from '@expo/vector-icons';

type SexOption = "male" | "female" | "other";

type Errors = {
  age?: string;
  height?: string;
  weight?: string;
  sex?: string;
};

const SEX_OPTIONS = [
  { label: "Masculino", value: "male" as SexOption, icon: "male" },
  { label: "Femenino", value: "female" as SexOption, icon: "female" },
  { label: "Otro", value: "other" as SexOption, icon: "person" },
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

    if (!age.trim()) {
      newErrors.age = "La edad es obligatoria";
      isValid = false;
    } else if (isNaN(Number(age)) || Number(age) <= 0 || Number(age) > 120) {
      newErrors.age = "Introduce una edad válida (1-120)";
      isValid = false;
    }

    if (!height.trim()) {
      newErrors.height = "La altura es obligatoria";
      isValid = false;
    } else if (isNaN(Number(height)) || Number(height) <= 0 || Number(height) > 300) {
      newErrors.height = "Introduce una altura válida en cm (1-300)";
      isValid = false;
    }

    if (!weight.trim()) {
      newErrors.weight = "El peso es obligatorio";
      isValid = false;
    } else if (isNaN(Number(weight)) || Number(weight) <= 0 || Number(weight) > 500) {
      newErrors.weight = "Introduce un peso válido en kg (1-500)";
      isValid = false;
    }

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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Datos Básicos</Text>
            <Text style={styles.headerSubtitle}>
              Configura tu perfil de atleta
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '33%' }]} />
            </View>
            <Text style={styles.progressText}>1 de 3</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  <Ionicons name="calendar-outline" size={16} color="#5E4B8B" /> Edad
                </Text>
                <View style={[styles.inputWrapper, errors.age && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Introduce tu edad"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={age}
                    onChangeText={(text) => {
                      setAge(text);
                      clearError('age');
                    }}
                  />
                  <Text style={styles.inputUnit}>años</Text>
                </View>
                {errors.age && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{errors.age}</Text>
                  </View>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  <Ionicons name="resize-outline" size={16} color="#5E4B8B" /> Altura
                </Text>
                <View style={[styles.inputWrapper, errors.height && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Introduce tu altura"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={height}
                    onChangeText={(text) => {
                      setHeight(text);
                      clearError('height');
                    }}
                  />
                  <Text style={styles.inputUnit}>cm</Text>
                </View>
                {errors.height && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{errors.height}</Text>
                  </View>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  <Ionicons name="scale-outline" size={16} color="#5E4B8B" /> Peso
                </Text>
                <View style={[styles.inputWrapper, errors.weight && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Introduce tu peso"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={(text) => {
                      setWeight(text);
                      clearError('weight');
                    }}
                  />
                  <Text style={styles.inputUnit}>kg</Text>
                </View>
                {errors.weight && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{errors.weight}</Text>
                  </View>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  <Ionicons name="person-outline" size={16} color="#5E4B8B" /> Sexo
                </Text>
                <View style={styles.sexOptionsContainer}>
                  {SEX_OPTIONS.map(({ label, value, icon }) => (
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
                      <Ionicons 
                        name={icon as any} 
                        size={20} 
                        color={sex === value ? "#FFFFFF" : "#5E4B8B"} 
                      />
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
                {errors.sex && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{errors.sex}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { opacity: age && height && weight && sex ? 1 : 0.6 }
            ]}
            onPress={handleContinue}
            disabled={!age || !height || !weight || !sex}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
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
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D6CDE8',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D1B4E',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B5B95',
    fontWeight: '400',
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: '#EDE9FE',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5E4B8B',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  formContainer: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 8,
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
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
  },
  inputUnit: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    flex: 1,
  },
  sexOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  sexOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  sexOptionSelected: {
    borderColor: '#5E4B8B',
    backgroundColor: '#5E4B8B',
  },
  sexOptionText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
  },
  sexOptionTextSelected: {
    color: '#FFFFFF',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5E4B8B',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
});