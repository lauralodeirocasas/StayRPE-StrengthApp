import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export interface Exercise {
  id: number;
  name: string;
  muscle: string;
  isCustom?: boolean;
  custom?: boolean;
  createdByUsername?: string;
}

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onExerciseSelected: (exercise: Exercise) => void;
  excludedExerciseIds?: number[];
  showCreateOption?: boolean;
  title?: string;
  subtitle?: string;
}

const ExercisePickerModal: React.FC<ExercisePickerModalProps> = ({
  visible,
  onClose,
  onExerciseSelected,
  excludedExerciseIds = [],
  showCreateOption = true,
  title = "Añadir Ejercicio",
  subtitle = "Busca un ejercicio o crea uno nuevo"
}) => {
  const router = useRouter();
  const API_URL = 'http://192.168.0.32:8080';

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('all');
  const [selectedExerciseType, setSelectedExerciseType] = useState<'predefined' | 'custom'>('predefined');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const muscleFilters = [
    { value: 'all', label: 'Todos' },
    { value: 'Pecho', label: 'Pecho' },
    { value: 'Dorsales', label: 'Dorsales' },
    { value: 'Cuádriceps', label: 'Cuádriceps' },
    { value: 'Isquiotibiales', label: 'Isquiotibiales' },
    { value: 'Glúteos', label: 'Glúteos' },
    { value: 'Gemelos', label: 'Gemelos' },
    { value: 'Hombros', label: 'Hombros' },
    { value: 'Biceps', label: 'Biceps' },
    { value: 'Triceps', label: 'Triceps' },
    { value: 'Core', label: 'Core' },
  ];

  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      setToken(storedToken);
    };
    getToken();
  }, []);

  useEffect(() => {
    if (token && visible) {
      loadExercises();
    }
  }, [token, visible]);

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSelectedMuscleFilter('all');
      setSelectedExerciseType('predefined');
    }
  }, [visible]);

  const loadExercises = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/exercises`, {
        headers: { Authorization: `Bearer ${token}` }
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
        const data = await response.json();
        setExercises(data);
      }
    } catch (error) {
      console.error('Error cargando ejercicios:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredExercises = () => {
    let filtered = exercises;
    
    if (selectedExerciseType === 'predefined') {
      filtered = filtered.filter(exercise => !exercise.isCustom && !exercise.custom);
    } else {
      filtered = filtered.filter(exercise => exercise.isCustom === true || exercise.custom === true);
    }
    
    if (selectedMuscleFilter !== 'all') {
      filtered = filtered.filter(exercise => exercise.muscle === selectedMuscleFilter);
    }
    
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
    }
    
    filtered = filtered.filter(exercise => !excludedExerciseIds.includes(exercise.id));
    
    return filtered;
  };

  const handleExerciseSelect = (exercise: Exercise) => {
    onExerciseSelected(exercise);
  };

  const handleClose = () => {
    onClose();
  };

  const filteredExercises = getFilteredExercises();

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalSubtitle}>{subtitle}</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.filtersContainer}>
              <View style={styles.exerciseTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    selectedExerciseType === 'predefined' && styles.typeButtonActive
                  ]}
                  onPress={() => setSelectedExerciseType('predefined')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    selectedExerciseType === 'predefined' && styles.typeButtonTextActive
                  ]}>
                    Predefinidos
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    selectedExerciseType === 'custom' && styles.typeButtonActive
                  ]}
                  onPress={() => setSelectedExerciseType('custom')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    selectedExerciseType === 'custom' && styles.typeButtonTextActive
                  ]}>
                    Personalizados
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleFilters}>
                {muscleFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter.value}
                    style={[
                      styles.muscleFilter,
                      selectedMuscleFilter === filter.value && styles.muscleFilterActive
                    ]}
                    onPress={() => setSelectedMuscleFilter(filter.value)}
                  >
                    <Text style={[
                      styles.muscleFilterText,
                      selectedMuscleFilter === filter.value && styles.muscleFilterTextActive
                    ]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar ejercicio..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
              {showCreateOption && selectedExerciseType === 'custom' && (
                <TouchableOpacity
                  style={styles.createExerciseButton}
                  onPress={() => {
                    onClose();
                    router.push({
                      pathname: '/routines/create-exercise',
                      params: { fromExerciseModal: 'true' }
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.createExerciseIcon}>
                    <Ionicons name="add-circle" size={24} color="#5E4B8B" />
                  </View>
                  <View style={styles.createExerciseContent}>
                    <Text style={styles.createExerciseText}>Crear ejercicio personalizado</Text>
                    <Text style={styles.createExerciseSubtext}>
                      Añade tu propio ejercicio con nombre y descripción personalizada
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#5E4B8B" />
                </TouchableOpacity>
              )}

              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#5E4B8B" />
                  <Text style={styles.loadingText}>Cargando ejercicios...</Text>
                </View>
              )}

              {!loading && filteredExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.exerciseItem}
                  onPress={() => handleExerciseSelect(exercise)}
                  activeOpacity={0.7}
                >
                  <View style={styles.exerciseItemContent}>
                    <View style={styles.exerciseItemIcon}>
                      <Ionicons 
                        name={(exercise.isCustom || exercise.custom) ? "person" : "fitness"} 
                        size={20} 
                        color="#5E4B8B"
                      />
                    </View>
                    <View style={styles.exerciseItemInfo}>
                      <Text style={styles.exerciseItemName}>{exercise.name}</Text>
                      <Text style={styles.exerciseItemMuscle}>{exercise.muscle}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              ))}

              {!loading && filteredExercises.length === 0 && !searchQuery && (
                <View style={styles.noExercisesContainer}>
                  <Ionicons name="search" size={48} color="#D1D5DB" />
                  <Text style={styles.noExercisesText}>No hay ejercicios disponibles</Text>
                  <Text style={styles.noExercisesSubtext}>
                    {selectedExerciseType === 'custom' 
                      ? 'Crea tu primer ejercicio personalizado'
                      : 'Todos los ejercicios están ya en uso'
                    }
                  </Text>
                  {selectedExerciseType === 'custom' && showCreateOption && (
                    <TouchableOpacity
                      style={styles.emptyStateCreateButton}
                      onPress={() => {
                        onClose();
                        router.push({
                          pathname: '/routines/create-exercise',
                          params: { fromExerciseModal: 'true' }
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle" size={20} color="white" />
                      <Text style={styles.emptyStateCreateButtonText}>Crear Ejercicio</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {!loading && filteredExercises.length === 0 && searchQuery && (
                <View style={styles.noExercisesContainer}>
                  <Ionicons name="search" size={48} color="#D1D5DB" />
                  <Text style={styles.noExercisesText}>No se encontraron ejercicios</Text>
                  <Text style={styles.noExercisesSubtext}>
                    Prueba con otros términos de búsqueda o crea un ejercicio personalizado
                  </Text>
                  {selectedExerciseType === 'custom' && showCreateOption && (
                    <TouchableOpacity
                      style={styles.emptyStateCreateButton}
                      onPress={() => {
                        onClose();
                        router.push({
                          pathname: '/routines/create-exercise',
                          params: { fromExerciseModal: 'true' }
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle" size={20} color="white" />
                      <Text style={styles.emptyStateCreateButtonText}>Crear Ejercicio</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    flex: 1,
    padding: 20,
    paddingTop: 16,
  },
  filtersContainer: {
    marginBottom: 20,
  },
  exerciseTypeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: '#5E4B8B',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  muscleFilters: {
    marginBottom: 16,
  },
  muscleFilter: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  muscleFilterActive: {
    backgroundColor: '#5E4B8B',
    borderColor: '#5E4B8B',
  },
  muscleFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  muscleFilterTextActive: {
    color: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  exercisesList: {
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  createExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  createExerciseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createExerciseContent: {
    flex: 1,
  },
  createExerciseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5E4B8B',
    marginBottom: 2,
  },
  createExerciseSubtext: {
    fontSize: 12,
    color: '#8B7AB8',
    lineHeight: 16,
  },
  exerciseItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exerciseItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseItemInfo: {
    flex: 1,
  },
  exerciseItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  exerciseItemMuscle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  noExercisesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noExercisesText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  noExercisesSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  emptyStateCreateButton: {
    backgroundColor: '#5E4B8B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginTop: 24,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateCreateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExercisePickerModal;