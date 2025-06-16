import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface UserProfile {
  username: string;
  firstName: string;
  lastName: string;
  age: number;
  height: number;
  weight: number;
  sex: string;
  fitnessGoal: string;
  experienceLevel: string;
  onboardingComplete: boolean;
}

const EditProfileScreen = () => {
  const router = useRouter();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [sex, setSex] = useState('male');
  const [fitnessGoal, setFitnessGoal] = useState('improve_fitness');
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);

  const API_URL = 'http://192.168.0.32:8080';

  const sexOptions = [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Femenino' },
    { value: 'other', label: 'Otro' },
  ];

  const fitnessGoalOptions = [
    { 
      value: 'lose_weight', 
      label: 'Perder grasa', 
      description: 'Reducir grasa corporal y mejorar composición corporal'
    },
    { 
      value: 'gain_muscle', 
      label: 'Ganar músculo', 
      description: 'Aumentar masa muscular y llevar tu físico a otro nivel'
    },
    { 
      value: 'improve_fitness', 
      label: 'Ganar fuerza', 
      description: 'Incrementar tu fuerza y levantar más peso'
    },
    { 
      value: 'maintain', 
      label: 'Mantener estado actual', 
      description: 'Conservar tu forma física y peso actuales'
    },
  ];

  const experienceLevelOptions = [
    { value: 'beginner', label: 'Principiante', description: 'Menos de 1 año' },
    { value: 'intermediate', label: 'Intermedio', description: '1-3 años' },
    { value: 'advanced', label: 'Avanzado', description: 'Más de 3 años' },
  ];

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        setToken(storedToken);
      } catch (error) {
        console.error('Error obteniendo token:', error);
      }
    };
    getToken();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        loadProfile();
      }
    }, [token])
  );

  const loadProfile = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/user/profile`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("onboardingComplete");
        Alert.alert("Sesión Expirada", "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", [
          { text: "OK", onPress: () => router.replace("/") }
        ]);
        return;
      }

      if (response.ok) {
        const data: UserProfile = await response.json();
        setOriginalProfile(data);
        
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setAge(data.age?.toString() || '');
        setHeight(data.height?.toString() || '');
        setWeight(data.weight?.toString() || '');
        setSex(data.sex || 'male');
        setFitnessGoal(data.fitnessGoal || 'improve_fitness');
        setExperienceLevel(data.experienceLevel || 'beginner');
      } else {
        Alert.alert('Error', 'No se pudo cargar el perfil');
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Error', 'El apellido es obligatorio');
      return false;
    }
    
    const ageNum = parseInt(age);
    if (!age || ageNum < 13 || ageNum > 100) {
      Alert.alert('Error', 'La edad debe estar entre 13 y 100 años');
      return false;
    }
    
    const heightNum = parseInt(height);
    if (!height || heightNum < 100 || heightNum > 250) {
      Alert.alert('Error', 'La altura debe estar entre 100 y 250 cm');
      return false;
    }
    
    const weightNum = parseFloat(weight);
    if (!weight || weightNum < 30 || weightNum > 300) {
      Alert.alert('Error', 'El peso debe estar entre 30 y 300 kg');
      return false;
    }

    return true;
  };

  const hasChanges = () => {
    if (!originalProfile) return false;
    
    return (
      firstName !== (originalProfile.firstName || '') ||
      lastName !== (originalProfile.lastName || '') ||
      age !== (originalProfile.age?.toString() || '') ||
      height !== (originalProfile.height?.toString() || '') ||
      weight !== (originalProfile.weight?.toString() || '') ||
      sex !== (originalProfile.sex || 'male') ||
      fitnessGoal !== (originalProfile.fitnessGoal || 'improve_fitness') ||
      experienceLevel !== (originalProfile.experienceLevel || 'beginner')
    );
  };

  const handleSave = async () => {
    if (!validateForm() || !token) {
      return;
    }

    setSaving(true);

    try {
      const profileData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: parseInt(age),
        height: parseInt(height),
        weight: parseFloat(weight),
        sex: sex,
        fitnessGoal: fitnessGoal,
        experienceLevel: experienceLevel,
      };

      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("onboardingComplete");
        Alert.alert("Sesión Expirada", "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", [
          { text: "OK", onPress: () => router.replace("/") }
        ]);
        return;
      }

      if (response.ok) {
        router.back()
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Error al actualizar el perfil');
      }
    } catch (error) {
      console.error('Error guardando perfil:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) {
      Alert.alert(
        'Descartar Cambios',
        '¿Estás seguro de que quieres descartar los cambios?',
        [
          { text: 'Continuar Editando', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  if (!token || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E4B8B" />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Editar Perfil</Text>
            <Text style={styles.headerSubtitle}>Actualiza tu información personal</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasChanges() || saving) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!hasChanges() || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="person" size={20} color="#5E4B8B" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Información Personal</Text>
                <Text style={styles.cardSubtitle}>Datos básicos de tu perfil</Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Tu nombre"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Apellido</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Tu apellido"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Edad</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={age}
                  onChangeText={setAge}
                  placeholder="25"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Altura (cm)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="175"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Peso (kg)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="70"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="body" size={20} color="#5E4B8B" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Sexo</Text>
                <Text style={styles.cardSubtitle}>Información biológica</Text>
              </View>
            </View>
          </View>

          <View style={styles.sexOptionsContainer}>
            {sexOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sexOption,
                  sex === option.value && styles.sexOptionSelected
                ]}
                onPress={() => setSex(option.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.sexOptionText,
                  sex === option.value && styles.sexOptionTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="locate" size={20} color="#5E4B8B" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Objetivo de Fitness</Text>
                <Text style={styles.cardSubtitle}>¿Cuál es tu meta principal?</Text>
              </View>
            </View>
          </View>

          <View style={styles.goalsList}>
            {fitnessGoalOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.goalOption,
                  fitnessGoal === option.value && styles.goalOptionActive
                ]}
                onPress={() => setFitnessGoal(option.value)}
                activeOpacity={0.8}
              >
                <View style={styles.goalInfo}>
                  <Text style={[
                    styles.goalTitle,
                    fitnessGoal === option.value && styles.goalTitleActive
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.goalDescriptionText}>
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="stats-chart" size={20} color="#5E4B8B" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Nivel de Experiencia</Text>
                <Text style={styles.cardSubtitle}>¿Cuánto tiempo llevas entrenando?</Text>
              </View>
            </View>
          </View>

          <View style={styles.experienceList}>
            {experienceLevelOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.experienceOption,
                  experienceLevel === option.value && styles.experienceOptionActive
                ]}
                onPress={() => setExperienceLevel(option.value)}
                activeOpacity={0.8}
              >
                <View style={styles.experienceInfo}>
                  <Text style={[
                    styles.experienceTitle,
                    experienceLevel === option.value && styles.experienceTitleActive
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.experienceDescription}>
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    marginBottom:30
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
  },
  saveButton: {
    backgroundColor: '#5E4B8B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  inputGroup: {
    marginBottom: 20,
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '400',
  },
  sexOptionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  sexOption: {
    flex: 1,
    paddingVertical: 14,
    marginHorizontal: 6,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "#DCD6F7",
    alignItems: "center",
    backgroundColor: "#F3F0FF",
  },
  sexOptionSelected: {
    backgroundColor: "#5E4B8B",
    borderColor: "#5936A2",
    shadowColor: "#5936A2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  sexOptionText: {
    fontSize: 16,
    color: "#7D7A8C",
    fontWeight: "600",
  },
  sexOptionTextSelected: {
    color: "#fff9db",
    fontWeight: "700",
  },
  goalsList: {
    gap: 12,
  },
  goalOption: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 20,
    minHeight: 80,
    justifyContent: 'center',
  },
  goalOptionActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#5E4B8B',
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  goalTitleActive: {
    color: '#5E4B8B',
  },
  goalDescriptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  experienceList: {
    gap: 12,
  },
  experienceOption: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 20,
    minHeight: 80,
    justifyContent: 'center',
  },
  experienceOptionActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#5E4B8B',
  },
  experienceInfo: {
    flex: 1,
  },
  experienceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  experienceTitleActive: {
    color: '#5E4B8B',
  },
  experienceDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: '#FBF9FE',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEDFB',
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5E4B8B',
  },
  infoText: {
    fontSize: 14,
    color: '#5E4B8B',
    lineHeight: 20,
  },
});

export default EditProfileScreen;