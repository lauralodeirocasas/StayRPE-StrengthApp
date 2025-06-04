// components/ExercisePickerModal.tsx
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

// =========================================================================
// INTERFACES
// =========================================================================
export interface Exercise {
  id: number;
  name: string;
  muscle: string;
  isCustom?: boolean;
  custom?: boolean;
  createdByUsername?: string;
}

interface CreateExerciseData {
  name: string;
  muscle: string;
  description: string;
  muscleGroup: string;
}

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onExerciseSelected: (exercise: Exercise) => void;
  excludedExerciseIds?: number[]; // IDs de ejercicios que ya están en uso
  showCreateOption?: boolean; // Si mostrar la opción de crear ejercicio
  title?: string;
  subtitle?: string;
}

// =========================================================================
// COMPONENTE PRINCIPAL
// =========================================================================
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
  const API_URL = 'http://192.168.0.57:8080';

  // Estados principales
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Estados de filtrado
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('all');
  const [selectedExerciseType, setSelectedExerciseType] = useState<'predefined' | 'custom'>('predefined');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Estados para creación de ejercicio
  const [showCreateExerciseModal, setShowCreateExerciseModal] = useState(false);
  const [createExerciseStep, setCreateExerciseStep] = useState<'form' | 'success'>('form');
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  
  const [exerciseForm, setExerciseForm] = useState<CreateExerciseData>({
    name: '',
    muscle: 'Pecho',
    description: '',
    muscleGroup: 'upper_body'
  });
  
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    muscle?: string;
    description?: string;
  }>({});

  // Filtros de músculos
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

  // =========================================================================
  // EFFECTS
  // =========================================================================
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

  // Resetear estado cuando se cierra el modal
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSelectedMuscleFilter('all');
      setSelectedExerciseType('predefined');
      setShowCreateExerciseModal(false);
      resetExerciseForm();
    }
  }, [visible]);

  // =========================================================================
  // FUNCIONES DE API
  // =========================================================================
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

  // =========================================================================
  // FUNCIONES DE FILTRADO
  // =========================================================================
  const getFilteredExercises = () => {
    let filtered = exercises;
    
    // Filtrar por tipo
    if (selectedExerciseType === 'predefined') {
      filtered = filtered.filter(exercise => !exercise.isCustom && !exercise.custom);
    } else {
      filtered = filtered.filter(exercise => exercise.isCustom === true || exercise.custom === true);
    }
    
    // Filtrar por músculo
    if (selectedMuscleFilter !== 'all') {
      filtered = filtered.filter(exercise => exercise.muscle === selectedMuscleFilter);
    }
    
    // Filtrar por búsqueda
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
    }
    
    // Excluir ejercicios ya seleccionados
    filtered = filtered.filter(exercise => !excludedExerciseIds.includes(exercise.id));
    
    return filtered;
  };

  // =========================================================================
  // FUNCIONES DE CREACIÓN DE EJERCICIOS
  // =========================================================================
  const validateExerciseForm = (): boolean => {
    const errors: typeof formErrors = {};
    
    if (!exerciseForm.name.trim()) {
      errors.name = 'El nombre es obligatorio';
    } else if (exerciseForm.name.trim().length < 3) {
      errors.name = 'El nombre debe tener al menos 3 caracteres';
    } else if (exerciseForm.name.trim().length > 100) {
      errors.name = 'El nombre no puede exceder 100 caracteres';
    }
    
    if (!exerciseForm.muscle) {
      errors.muscle = 'Debes seleccionar un músculo';
    }
    
    if (exerciseForm.description && exerciseForm.description.trim().length > 500) {
      errors.description = 'La descripción no puede exceder 500 caracteres';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getMuscleGroup = (muscle: string): string => {
    const upperBody = ['Pecho', 'Dorsales', 'Hombros', 'Biceps', 'Triceps'];
    const lowerBody = ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Gemelos'];
    const core = ['Core'];

    if (upperBody.includes(muscle)) return 'upper_body';
    if (lowerBody.includes(muscle)) return 'lower_body';
    if (core.includes(muscle)) return 'core';
    return 'full_body';
  };

  const updateExerciseForm = (field: keyof CreateExerciseData, value: string) => {
    const newForm = { ...exerciseForm, [field]: value };
    
    if (field === 'muscle') {
      newForm.muscleGroup = getMuscleGroup(value);
    }
    
    setExerciseForm(newForm);
    
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const resetExerciseForm = () => {
    setExerciseForm({
      name: '',
      muscle: 'Pecho',
      description: '',
      muscleGroup: 'upper_body'
    });
    setFormErrors({});
    setCreateExerciseStep('form');
  };

  const createCustomExercise = async (): Promise<Exercise | null> => {
    if (!token) {
      Alert.alert('Error', 'No hay token de autenticación');
      return null;
    }

    if (!validateExerciseForm()) {
      Alert.alert('Error de validación', 'Por favor corrige los errores en el formulario');
      return null;
    }

    try {
      setIsCreatingExercise(true);
      
      const requestData = {
        name: exerciseForm.name.trim(),
        muscle: exerciseForm.muscle,
        description: exerciseForm.description.trim(),
        muscleGroup: exerciseForm.muscleGroup
      };

      const response = await fetch(`${API_URL}/exercises/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("onboardingComplete");
        Alert.alert("Sesión Expirada", "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", [
          { text: "OK", onPress: () => router.replace("/") }
        ]);
        return null;
      }

      if (response.ok) {
        const newExercise = await response.json();
        
        // Actualizar lista de ejercicios
        setExercises(prev => [...prev, newExercise]);
        
        // Mostrar paso de éxito
        setCreateExerciseStep('success');
        
        return newExercise;
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Error al crear ejercicio');
        return null;
      }
    } catch (error) {
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor');
      return null;
    } finally {
      setIsCreatingExercise(false);
    }
  };

  const handleExerciseCreated = async (exercise: Exercise) => {
    setTimeout(() => {
      setShowCreateExerciseModal(false);
      resetExerciseForm();
      
      // Llamar al callback del padre
      onExerciseSelected(exercise);
    }, 1500);
  };

  // =========================================================================
  // HANDLERS
  // =========================================================================
  const handleExerciseSelect = (exercise: Exercise) => {
    onExerciseSelected(exercise);
  };

  const handleClose = () => {
    setShowCreateExerciseModal(false);
    onClose();
  };

  // =========================================================================
  // RENDERIZADO
  // =========================================================================
  const renderCreateExerciseModal = () => {
    return (
      <Modal
        visible={showCreateExerciseModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!isCreatingExercise) {
            setShowCreateExerciseModal(false);
            resetExerciseForm();
          }
        }}
      >
        <KeyboardAvoidingView 
          style={styles.createExerciseModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.createExerciseModal}>
            {createExerciseStep === 'form' ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>Crear Ejercicio Personalizado</Text>
                    <Text style={styles.modalSubtitle}>Añade tu propio ejercicio</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setShowCreateExerciseModal(false);
                      resetExerciseForm();
                    }}
                    activeOpacity={0.7}
                    disabled={isCreatingExercise}
                  >
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.createExerciseForm} showsVerticalScrollIndicator={false}>
                  {/* Nombre del ejercicio */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Nombre del ejercicio *</Text>
                    <TextInput
                      style={[
                        styles.formInput,
                        formErrors.name && styles.formInputError
                      ]}
                      value={exerciseForm.name}
                      onChangeText={(text) => updateExerciseForm('name', text)}
                      placeholder="Ej: Press inclinado con mancuernas"
                      placeholderTextColor="#9CA3AF"
                      editable={!isCreatingExercise}
                    />
                    {formErrors.name && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#EF4444" />
                        <Text style={styles.errorText}>{formErrors.name}</Text>
                      </View>
                    )}
                  </View>

                  {/* Músculo principal */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Músculo principal *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleOptions}>
                      {muscleFilters.slice(1).map((muscle) => (
                        <TouchableOpacity
                          key={muscle.value}
                          style={[
                            styles.muscleOption,
                            exerciseForm.muscle === muscle.value && styles.muscleOptionActive
                          ]}
                          onPress={() => updateExerciseForm('muscle', muscle.value)}
                          disabled={isCreatingExercise}
                        >
                          <Text style={[
                            styles.muscleOptionText,
                            exerciseForm.muscle === muscle.value && styles.muscleOptionTextActive
                          ]}>
                            {muscle.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {formErrors.muscle && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#EF4444" />
                        <Text style={styles.errorText}>{formErrors.muscle}</Text>
                      </View>
                    )}
                  </View>

                  {/* Descripción */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Descripción (opcional)</Text>
                    <TextInput
                      style={[
                        styles.formInput, 
                        styles.formTextArea,
                        formErrors.description && styles.formInputError
                      ]}
                      value={exerciseForm.description}
                      onChangeText={(text) => updateExerciseForm('description', text)}
                      placeholder="Describe cómo realizar el ejercicio..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      editable={!isCreatingExercise}
                    />
                    <Text style={styles.characterCount}>
                      {exerciseForm.description.length}/500 caracteres
                    </Text>
                    {formErrors.description && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#EF4444" />
                        <Text style={styles.errorText}>{formErrors.description}</Text>
                      </View>
                    )}
                  </View>

                  {/* Vista previa */}
                  <View style={styles.previewCard}>
                    <Text style={styles.previewTitle}>Vista previa:</Text>
                    <View style={styles.previewContent}>
                      <View style={styles.previewIconContainer}>
                        <Ionicons name="fitness" size={20} color="#5E4B8B" />
                      </View>
                      <View style={styles.previewTextContainer}>
                        <Text style={styles.previewName}>
                          {exerciseForm.name.trim() || 'Nombre del ejercicio'}
                        </Text>
                        <Text style={styles.previewMuscle}>
                          {exerciseForm.muscle}
                        </Text>
                        {exerciseForm.description.trim() && (
                          <Text style={styles.previewDescription}>
                            {exerciseForm.description.trim()}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.createExerciseActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowCreateExerciseModal(false);
                      resetExerciseForm();
                    }}
                    activeOpacity={0.8}
                    disabled={isCreatingExercise}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.createButton,
                      (!exerciseForm.name.trim() || isCreatingExercise) && styles.createButtonDisabled
                    ]}
                    onPress={async () => {
                      const createdExercise = await createCustomExercise();
                      if (createdExercise) {
                        await handleExerciseCreated(createdExercise);
                      }
                    }}
                    disabled={!exerciseForm.name.trim() || isCreatingExercise}
                    activeOpacity={0.8}
                  >
                    {isCreatingExercise ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Ionicons name="add-circle" size={20} color="white" />
                        <Text style={styles.createButtonText}>Crear y Añadir</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // Pantalla de éxito
              <View style={styles.successContainer}>
                <View style={styles.successContent}>
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                  </View>
                  <Text style={styles.successTitle}>¡Ejercicio Creado!</Text>
                  <Text style={styles.successSubtitle}>
                    "{exerciseForm.name}" se ha creado exitosamente.
                  </Text>
                  <View style={styles.successDetails}>
                    <Text style={styles.successDetailText}>
                      • Músculo: {exerciseForm.muscle}
                    </Text>
                    <Text style={styles.successDetailText}>
                      • Grupo: {exerciseForm.muscleGroup.replace('_', ' ').toUpperCase()}
                    </Text>
                    {exerciseForm.description.trim() && (
                      <Text style={styles.successDetailText}>
                        • Con descripción personalizada
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    );
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
            {/* Filtros */}
            <View style={styles.filtersContainer}>
              {/* Selector de tipo de ejercicio */}
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

              {/* Filtro por músculo */}
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

              {/* Buscador */}
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

            {/* Lista de ejercicios */}
            <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
              {/* Botón para crear ejercicio personalizado */}
              {showCreateOption && (
                <TouchableOpacity
                  style={styles.createExerciseButton}
                  onPress={() => setShowCreateExerciseModal(true)}
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

              {/* Loading */}
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#5E4B8B" />
                  <Text style={styles.loadingText}>Cargando ejercicios...</Text>
                </View>
              )}

              {/* Ejercicios existentes */}
              {!loading && filteredExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.exerciseItem}
                  onPress={() => handleExerciseSelect(exercise)}
                  activeOpacity={0.7}
                >
                  <View style={styles.exerciseItemContent}>
                    <View style={[
                      styles.exerciseItemIcon,
                      (exercise.isCustom || exercise.custom) && styles.customExerciseIcon
                    ]}>
                      <Ionicons 
                        name={(exercise.isCustom || exercise.custom) ? "person" : "fitness"} 
                        size={20} 
                        color={(exercise.isCustom || exercise.custom) ? "#F59E0B" : "#5E4B8B"} 
                      />
                    </View>
                    <View style={styles.exerciseItemInfo}>
                      <Text style={styles.exerciseItemName}>{exercise.name}</Text>
                      <Text style={styles.exerciseItemMuscle}>{exercise.muscle}</Text>
                      {(exercise.isCustom || exercise.custom) && (
                        <Text style={styles.exerciseItemCreator}>
                          Por {exercise.createdByUsername || 'ti'}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              ))}

              {/* Estados vacíos */}
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
                </View>
              )}

              {!loading && filteredExercises.length === 0 && searchQuery && (
                <View style={styles.noExercisesContainer}>
                  <Ionicons name="search" size={48} color="#D1D5DB" />
                  <Text style={styles.noExercisesText}>No se encontraron ejercicios</Text>
                  <Text style={styles.noExercisesSubtext}>
                    Prueba con otros términos de búsqueda o crea un ejercicio personalizado
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal de creación de ejercicio */}
      {renderCreateExerciseModal()}
    </>
  );
};

// =========================================================================
// ESTILOS
// =========================================================================
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

  // Filtros
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

  // Lista de ejercicios
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
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#5E4B8B',
    borderStyle: 'dashed',
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
  customExerciseIcon: {
    backgroundColor: '#FEF3C7',
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
  exerciseItemCreator: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 2,
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

  // Modal de creación de ejercicio
  createExerciseModalContainer: {
    flex: 1,
  },
  createExerciseModal: {
    flex: 1,
    backgroundColor: 'white',
  },
  createExerciseForm: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  formInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  formTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
  muscleOptions: {
    marginTop: 8,
  },
  muscleOption: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  muscleOptionActive: {
    backgroundColor: '#5E4B8B',
    borderColor: '#5E4B8B',
  },
  muscleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  muscleOptionTextActive: {
    color: 'white',
  },
  previewCard: {
    backgroundColor: '#EDE9FE',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#5E4B8B',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5E4B8B',
    marginBottom: 12,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  previewIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTextContainer: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5E4B8B',
    marginBottom: 2,
  },
  previewMuscle: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 12,
    color: '#7C3AED',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  createExerciseActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  createButton: {
    backgroundColor: '#5E4B8B',
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  successDetails: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  successDetailText: {
    fontSize: 14,
    color: '#065F46',
    marginBottom: 4,
    lineHeight: 20,
  },
});

export default ExercisePickerModal;