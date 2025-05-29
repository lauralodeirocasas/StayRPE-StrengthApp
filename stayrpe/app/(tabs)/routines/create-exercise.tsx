import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const CreateExerciseScreen = () => {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('chest');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const router = useRouter();
  const API_URL = 'http://192.168.0.57:8080';

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

  const getMuscleGroup = (muscle: string) => {
    const upperBody = ['chest', 'back', 'shoulders', 'arms'];
    const lowerBody = ['legs'];
    const core = ['core'];

    if (upperBody.includes(muscle)) return 'upper_body';
    if (lowerBody.includes(muscle)) return 'lower_body';
    if (core.includes(muscle)) return 'core';
    return 'full_body';
  };

  const createExercise = async () => {
    if (!token) {
      Alert.alert('Error', 'No hay token de autenticación');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Error', 'El nombre del ejercicio es obligatorio');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/exercises/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          muscle: muscle,
          description: description.trim(),
          muscleGroup: getMuscleGroup(muscle)
        })
      });

      // VERIFICACIÓN TOKEN EXPIRADO
      if (response.status === 401) {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("onboardingComplete");
        Alert.alert("Sesión Expirada", "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", [
          { text: "OK", onPress: () => router.replace("/") }
        ]);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Ejercicio Creado',
          `"${data.name}" se ha creado correctamente.`,
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert('Error', data.error || 'Error al crear ejercicio');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar con el servidor');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const muscleOptions = [
    { value: 'chest', label: 'Pecho' },
    { value: 'back', label: 'Espalda' },
    { value: 'legs', label: 'Piernas' },
    { value: 'shoulders', label: 'Hombros' },
    { value: 'arms', label: 'Brazos' },
    { value: 'core', label: 'Abdomen' },
  ];

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E4B8B" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header moderno */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Nuevo Ejercicio</Text>
            <Text style={styles.headerSubtitle}>Crea tu ejercicio personalizado</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Formulario principal */}
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre del Ejercicio</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Press de banca inclinado"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Grupo Muscular</Text>
            <View style={styles.muscleGrid}>
              {muscleOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.muscleOption,
                    muscle === option.value && styles.muscleOptionActive
                  ]}
                  onPress={() => setMuscle(option.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.muscleOptionText,
                    muscle === option.value && styles.muscleOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripción (Opcional)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe cómo realizar el ejercicio..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* Botón de crear */}
          <TouchableOpacity 
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={createExercise}
            disabled={loading || !name.trim()}
            activeOpacity={0.9}
          >
            <View style={styles.createButtonContent}>
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text style={styles.createButtonText}>Crear Ejercicio</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Card de consejos */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <View style={styles.tipsIconContainer}>
              <Ionicons name="bulb" size={20} color="#5E4B8B" />
            </View>
            <Text style={styles.tipsTitle}>Consejos para crear ejercicios</Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>Usa nombres descriptivos y específicos</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>El grupo muscular ayuda a organizar tu biblioteca</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>La descripción es útil para recordar la técnica</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
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
  inputGroup: {
    marginBottom: 24,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  muscleOption: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  muscleOptionActive: {
    backgroundColor: '#5E4B8B',
    borderColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  muscleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  muscleOptionTextActive: {
    color: 'white',
  },
  createButton: {
    backgroundColor: '#5E4B8B',
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 8,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  tipsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5E4B8B',
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
});

export default CreateExerciseScreen;