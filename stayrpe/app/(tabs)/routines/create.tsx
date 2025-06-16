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
  Modal,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ExercisePickerModal, { Exercise } from '../../../components/ExercisePickerModal';

interface SelectedExercise {
  exerciseId: number;
  exerciseName: string;
  exerciseMuscle: string;
  order: number;
  numberOfSets: number;
  restBetweenSets: number;
  notes: string;
  intensityType: 'RIR' | 'RPE';
  sets: SetData[];
  tempId?: string;
  id?: number;
}

interface SetData {
  setNumber: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeight: number;
  intensity: number;
  notes: string;
  id?: number;
}

interface RoutineData {
  id: number;
  name: string;
  description: string;
  exercises: Array<{
    id: number;
    exerciseId: number;
    exerciseName: string;
    exerciseMuscle: string;
    order: number;
    numberOfSets: number;
    restBetweenSets: number;
    notes: string;
    sets: Array<{
      id: number;
      setNumber: number;
      targetRepsMin: number;
      targetRepsMax: number;
      targetWeight: number;
      rir: number;
      rpe: number;
      notes: string;
    }>;
  }>;
}

const CreateRoutineScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<SelectedExercise | null>(null);
  const [showSetEditor, setShowSetEditor] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [routineId, setRoutineId] = useState<number | null>(null);

  const API_URL = 'http://192.168.0.32:8080';

  useEffect(() => {
    const initializeData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        setToken(storedToken);
        
        if (params.isEditing === 'true' && params.routineData && params.routineId) {
          setIsEditing(true);
          setRoutineId(parseInt(params.routineId as string));
          const routineData: RoutineData = JSON.parse(params.routineData as string);
          loadRoutineDataForEdit(routineData);
        }
      } catch (error) {
        console.error('Error inicializando datos:', error);
      }
    };
    initializeData();
  }, []);

  const loadRoutineDataForEdit = (routineData: RoutineData) => {
    setName(routineData.name);
    setDescription(routineData.description || '');
    
    const convertedExercises: SelectedExercise[] = routineData.exercises.map((exercise) => {
      const hasRir = exercise.sets.some(set => set.rir > 0);
      const intensityType: 'RIR' | 'RPE' = hasRir ? 'RIR' : 'RPE';
      
      return {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        exerciseMuscle: exercise.exerciseMuscle,
        order: exercise.order,
        numberOfSets: exercise.numberOfSets,
        restBetweenSets: exercise.restBetweenSets || 90,
        notes: exercise.notes || '',
        intensityType: intensityType,
        id: exercise.id,
        sets: exercise.sets.map(set => ({
          setNumber: set.setNumber,
          targetRepsMin: set.targetRepsMin,
          targetRepsMax: set.targetRepsMax,
          targetWeight: set.targetWeight,
          intensity: intensityType === 'RIR' ? set.rir : set.rpe,
          notes: set.notes || '',
          id: set.id
        }))
      };
    });
    
    setSelectedExercises(convertedExercises);
  };

  const handleExerciseSelected = (exercise: Exercise) => {
    const tempId = `temp_${Date.now()}_${exercise.id}`;
    const newExercise: SelectedExercise = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseMuscle: exercise.muscle,
      order: selectedExercises.length + 1,
      numberOfSets: 3,
      restBetweenSets: 90,
      notes: '',
      intensityType: 'RIR',
      tempId: tempId,
      sets: [
        { setNumber: 1, targetRepsMin: 8, targetRepsMax: 12, targetWeight: 20.0, intensity: 2, notes: '' },
        { setNumber: 2, targetRepsMin: 8, targetRepsMax: 12, targetWeight: 22.5, intensity: 1, notes: '' },
        { setNumber: 3, targetRepsMin: 8, targetRepsMax: 12, targetWeight: 25.0, intensity: 0, notes: '' }
      ]
    };
    
    const newSelectedExercises = [...selectedExercises, newExercise];
    setSelectedExercises(newSelectedExercises);
    setShowExerciseModal(false);
    
    setEditingExercise(newExercise);
    setEditingIndex(newSelectedExercises.length - 1);
    setShowSetEditor(true);
  };

  const removeExercise = (index: number) => {
    const newSelected = selectedExercises.filter((_, i) => i !== index);
    const reordered = newSelected.map((ex, i) => ({ ...ex, order: i + 1 }));
    setSelectedExercises(reordered);
  };

  const editExercise = (index: number) => {
    setEditingExercise({ ...selectedExercises[index] });
    setEditingIndex(index);
    setShowSetEditor(true);
  };

  const updateExercise = (updatedExercise: SelectedExercise) => {
    if (editingIndex !== null) {
      const newExercises = [...selectedExercises];
      const { tempId, ...exerciseWithoutTempId } = updatedExercise;
      newExercises[editingIndex] = exerciseWithoutTempId;
      setSelectedExercises(newExercises);
    }
    setShowSetEditor(false);
    setEditingExercise(null);
    setEditingIndex(null);
  };

  const addSetToExercise = () => {
    if (!editingExercise) return;
    const newSet: SetData = {
      setNumber: editingExercise.sets.length + 1,
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetWeight: 20.0,
      intensity: editingExercise.intensityType === 'RIR' ? 2 : 8,
      notes: ''
    };
    setEditingExercise({
      ...editingExercise,
      sets: [...editingExercise.sets, newSet],
      numberOfSets: editingExercise.sets.length + 1
    });
  };

  const removeSetFromExercise = (setIndex: number) => {
    if (!editingExercise || editingExercise.sets.length <= 1) return;
    const newSets = editingExercise.sets
      .filter((_, i) => i !== setIndex)
      .map((set, i) => ({ ...set, setNumber: i + 1 }));
    setEditingExercise({
      ...editingExercise,
      sets: newSets,
      numberOfSets: newSets.length
    });
  };

  const updateSet = (setIndex: number, field: keyof SetData, value: any) => {
    if (!editingExercise) return;
    const newSets = [...editingExercise.sets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
    setEditingExercise({ ...editingExercise, sets: newSets });
  };

  const toggleIntensityType = () => {
    if (!editingExercise) return;
    const newType = editingExercise.intensityType === 'RIR' ? 'RPE' : 'RIR';
    const newSets = editingExercise.sets.map(set => ({
      ...set,
      intensity: newType === 'RIR' ? 2 : 8
    }));
    setEditingExercise({
      ...editingExercise,
      intensityType: newType,
      sets: newSets
    });
  };

  const handleRestChange = (text: string) => {
    if (!editingExercise) return;
    
    if (text === '') {
      setEditingExercise({
        ...editingExercise,
        restBetweenSets: 0
      });
      return;
    }
    
    const numValue = parseInt(text);
    if (!isNaN(numValue) && numValue >= 0) {
      setEditingExercise({
        ...editingExercise,
        restBetweenSets: numValue
      });
    }
  };

  // 🔥 NUEVA FUNCIÓN: Manejar error de rutina en uso
  const handleRoutineInUseError = (errorData: any) => {
    const macrocycleNames = errorData.macrocycleDetails
      ?.map((m: any) => m.name)
      ?.join(', ') || 'macrociclos activos';
    
    const macrocycleCount = errorData.activeMacrocycles || 0;
    
    let alertTitle = 'No se puede editar';
    let alertMessage = '';

    alertMessage = `La rutina "${errorData.routineName}" está siendo utilizada en el macrociclo activo.\n\nSolo podras editar aquellas rutinas que no esté en un macrociclo activo.`;
    
    
    Alert.alert(
      alertTitle,
      alertMessage,
      [
        {
          text: 'Duplicar rutina',
          onPress: () => handleDuplicateRoutine(),
          style: 'default'
        },
        {
          text: 'Desactivar macrociclo',
          onPress: () => router.push("/(tabs)/macrocycle"),
          style: 'default'
        },
        {
          text: 'Cancelar',
          style: 'cancel'
        }
      ],
      { cancelable: true }
    );
  };

  // 🔥 NUEVA FUNCIÓN: Duplicar rutina
  const handleDuplicateRoutine = async () => {
    if (!token || !routineId) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/routines/${routineId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `${name} (Copia)`
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert(
          '¡Rutina duplicada!',
          `Se creó una copia: "${data.duplicatedRoutineName}". Ahora puedes editarla libremente.`,
          [
            {
              text: 'Editar copia',
              onPress: () => {
                router.replace({
                  pathname: '/routines/create',
                  params: {
                    isEditing: 'true',
                    routineId: data.routine.id.toString(),
                    routineData: JSON.stringify(data.routine)
                  }
                });
              }
            },
            {
              text: 'Volver',
              onPress: () => router.back(),
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Error', data.error || 'No se pudo duplicar la rutina');
      }
    } catch (error) {
      console.error('Error duplicando rutina:', error);
      Alert.alert('Error', 'Error de conexión al duplicar la rutina');
    } finally {
      setLoading(false);
    }
  };

  

  // 🔥 ACTUALIZADA: Función de envío con manejo de rutina en uso
  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Error', 'No se encontró token de autenticación');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Error', 'El nombre de la rutina es obligatorio');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos un ejercicio');
      return;
    }
    
    setLoading(true);
    
    try {
      const routineData = {
        name: name.trim(),
        description: description.trim(),
        exercises: selectedExercises.map(exercise => {
          const { tempId, id, ...exerciseData } = exercise;
          return {
            ...exerciseData,
            sets: exercise.sets.map(set => {
              const { id: setId, ...setData } = set;
              return {
                ...setData,
                rir: exercise.intensityType === 'RIR' ? set.intensity : 0,
                rpe: exercise.intensityType === 'RPE' ? set.intensity : 0
              };
            })
          };
        })
      };

      let response;
      let successMessage;

      if (isEditing && routineId) {
        response = await fetch(`${API_URL}/routines/${routineId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(routineData)
        });
        successMessage = 'Rutina actualizada exitosamente';
      } else {
        response = await fetch(`${API_URL}/routines`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(routineData)
        });
        successMessage = 'Rutina creada exitosamente';
      }

      if (response.status === 401) {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("onboardingComplete");
        Alert.alert(
          "Sesión Expirada", 
          "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", 
          [{ text: "OK", onPress: () => router.replace("/") }]
        );
        return;
      }

      const data = await response.json();
      
      if (response.ok) {
        // Manejar respuesta exitosa
        let message = successMessage;
        if (data.routine) {
          message = `${successMessage}: "${data.routine.name}"`;
        } else if (data.name) {
          message = `${successMessage}: "${data.name}"`;
        }
        
        Alert.alert(
          "¡Éxito!", 
          message, 
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (response.status === 409 && data.errorCode === 'ROUTINE_IN_USE') {
        // 🔥 NUEVO: Manejar rutina en uso
        handleRoutineInUseError(data);
      } else {
        // Otros errores
        if (data.error && data.error.includes('Ya tienes una rutina con el nombre')) {
          Alert.alert(
            'Nombre duplicado', 
            data.error,
            [{ text: 'OK', onPress: () => {} }]
          );
        } else {
          Alert.alert(
            'Error', 
            data.error || `Error al ${isEditing ? 'actualizar' : 'crear'} la rutina`
          );
        }
      }
    } catch (error) {
      console.error('Error de red:', error);
      Alert.alert(
        'Error de conexión', 
        'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 🔥 NUEVA FUNCIÓN: Renderizar botón de duplicar
  const renderDuplicateButton = () => {
    if (!isEditing) return null;
    
    return (
      <TouchableOpacity
        style={styles.duplicateButton}
        onPress={handleDuplicateRoutine}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Ionicons name="copy-outline" size={18} color="#5E4B8B" />
        <Text style={styles.duplicateButtonText}>Duplicar</Text>
      </TouchableOpacity>
    );
  };

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E4B8B" />
        </View>
      </SafeAreaView>
    );
  }

  const excludedExerciseIds = selectedExercises.map(ex => ex.exerciseId);

  return (
    <View style={styles.container}>
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
            <Text style={styles.headerTitle}>
              {isEditing ? 'Editar Rutina' : 'Nueva Rutina'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isEditing ? 'Modifica tu entrenamiento' : 'Crea tu entrenamiento personalizado'}
            </Text>
          </View>
          {/* 🔥 NUEVO: Botón de duplicar en el header */}
          {renderDuplicateButton()}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre de la rutina</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej. Push Pull Legs"
                placeholderTextColor="#9CA3AF"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripción</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe tu rutina (opcional)"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>
          </View>
        </View>

        <View style={styles.exercisesCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="barbell" size={20} color="#5E4B8B" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Ejercicios</Text>
                <Text style={styles.cardSubtitle}>
                  {selectedExercises.length} ejercicio{selectedExercises.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.addButton, loading && styles.addButtonDisabled]}
              onPress={() => !loading && setShowExerciseModal(true)}
              activeOpacity={loading ? 1 : 0.8}
              disabled={loading}
            >
              <Ionicons name="add" size={18} color={loading ? "#9CA3AF" : "white"} />
            </TouchableOpacity>
          </View>

          {selectedExercises.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="fitness-outline" size={40} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyTitle}>Ningún ejercicio agregado</Text>
              <Text style={styles.emptySubtitle}>Toca el botón + para empezar</Text>
            </View>
          ) : (
            <View style={styles.exercisesList}>
              {selectedExercises.map((exercise, index) => (
                <View key={exercise.tempId || exercise.id || `${exercise.exerciseId}-${index}`} style={styles.exerciseItem}>
                  <View style={styles.exerciseContent}>
                    <View style={styles.exerciseNumber}>
                      <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                      <View style={styles.exerciseMeta}>
                        <View style={styles.muscleChip}>
                          <Text style={styles.muscleText}>{exercise.exerciseMuscle}</Text>
                        </View>
                        <Text style={styles.exerciseStats}>
                          {exercise.numberOfSets} series • {exercise.intensityType}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.exerciseActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, loading && styles.actionButtonDisabled]}
                        onPress={() => !loading && editExercise(index)}
                        activeOpacity={loading ? 1 : 0.7}
                        disabled={loading}
                      >
                        <Ionicons name="pencil" size={16} color={loading ? "#D1D5DB" : "#6B7280"} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton, loading && styles.actionButtonDisabled]}
                        onPress={() => !loading && removeExercise(index)}
                        activeOpacity={loading ? 1 : 0.7}
                        disabled={loading}
                      >
                        <Ionicons name="trash" size={16} color={loading ? "#D1D5DB" : "#EF4444"} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.createButton,
            (loading || !name.trim() || selectedExercises.length === 0) && styles.createButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading || !name.trim() || selectedExercises.length === 0}
          activeOpacity={0.9}
        >
          <View style={styles.createButtonContent}>
            {loading ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.createButtonText}>
                  {isEditing ? 'Actualizando...' : 'Creando...'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.createButtonText}>
                  {isEditing ? 'Actualizar Rutina' : 'Crear Rutina'}
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </ScrollView>

      <ExercisePickerModal
        visible={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onExerciseSelected={handleExerciseSelected}
        excludedExerciseIds={excludedExerciseIds}
        showCreateOption={true}
        title="Agregar Ejercicio"
        subtitle="Selecciona de tu biblioteca o crea uno nuevo"
      />

      <Modal visible={showSetEditor} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={() => {
                setShowSetEditor(false);
                setEditingExercise(null);
                setEditingIndex(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#6B7280" />
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>{editingExercise?.exerciseName}</Text>
              <Text style={styles.modalSubtitle}>Configurar series</Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => editingExercise && updateExercise(editingExercise)}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Configuración General</Text>
              
              <View style={styles.configRow}>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Descanso entre series</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.configInputImproved}
                      value={editingExercise?.restBetweenSets === 0 ? '' : editingExercise?.restBetweenSets?.toString() || ''}
                      onChangeText={handleRestChange}
                      keyboardType="number-pad"
                      placeholder="90"
                      placeholderTextColor="#9CA3AF"
                      selectTextOnFocus={true}
                      onBlur={() => {
                        if (!editingExercise?.restBetweenSets || editingExercise.restBetweenSets === 0) {
                          setEditingExercise(prev => prev ? { ...prev, restBetweenSets: 90 } : null);
                        }
                      }}
                    />
                    <Text style={styles.unitLabel}>seg</Text>
                  </View>
                </View>
                
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Tipo de intensidad</Text>
                  <View style={styles.intensityToggleImproved}>
                    <TouchableOpacity
                      style={[
                        styles.intensityButtonImproved,
                        editingExercise?.intensityType === 'RIR' && styles.intensityButtonActiveImproved
                      ]}
                      onPress={toggleIntensityType}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.intensityButtonTextImproved,
                        editingExercise?.intensityType === 'RIR' && styles.intensityButtonTextActiveImproved
                      ]}>RIR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.intensityButtonImproved,
                        editingExercise?.intensityType === 'RPE' && styles.intensityButtonActiveImproved
                      ]}
                      onPress={toggleIntensityType}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.intensityButtonTextImproved,
                        editingExercise?.intensityType === 'RPE' && styles.intensityButtonTextActiveImproved
                      ]}>RPE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.setsCard}>
              <View style={styles.setsHeader}>
                <View>
                  <Text style={styles.configTitle}>Series</Text>
                  <Text style={styles.setsSubtitle}>{editingExercise?.sets?.length || 0} series configuradas</Text>
                </View>
                <TouchableOpacity
                  style={styles.addSetButtonImproved}
                  onPress={addSetToExercise}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="white" />
                  <Text style={styles.addSetButtonText}>Agregar</Text>
                </TouchableOpacity>
              </View>

              {editingExercise?.sets?.map((set, setIndex) => (
                <View key={setIndex} style={styles.setItemImproved}>
                  <View style={styles.setHeaderImproved}>
                    <View style={styles.setNumberContainer}>
                      <Text style={styles.setNumberImproved}>Serie {set.setNumber}</Text>
                    </View>
                    {editingExercise.sets.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeSetFromExercise(setIndex)}
                        activeOpacity={0.7}
                        style={styles.removeSetButtonImproved}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.setInputsGridImproved}>
                    <View style={styles.inputRowImproved}>
                      <View style={styles.inputGroupImproved}>
                        <Text style={styles.setInputLabelImproved}>Reps Mínimas</Text>
                        <TextInput
                          style={styles.setInputImproved}
                          value={set.targetRepsMin?.toString() || ''}
                          onChangeText={(text) => updateSet(setIndex, 'targetRepsMin', parseInt(text) || 0)}
                          keyboardType="number-pad"
                          placeholder="8"
                          placeholderTextColor="#9CA3AF"
                          selectTextOnFocus={true}
                        />
                      </View>
                      <View style={styles.inputGroupImproved}>
                        <Text style={styles.setInputLabelImproved}>Reps Máximas</Text>
                        <TextInput
                          style={styles.setInputImproved}
                          value={set.targetRepsMax?.toString() || ''}
                          onChangeText={(text) => updateSet(setIndex, 'targetRepsMax', parseInt(text) || 0)}
                          keyboardType="number-pad"
                          placeholder="12"
                          placeholderTextColor="#9CA3AF"
                          selectTextOnFocus={true}
                        />
                      </View>
                    </View>

                    <View style={styles.inputRowImproved}>
                      <View style={styles.inputGroupImproved}>
                        <Text style={styles.setInputLabelImproved}>Peso (kg)</Text>
                        <TextInput
                          style={styles.setInputImproved}
                          value={set.targetWeight?.toString() || ''}
                          onChangeText={(text) => updateSet(setIndex, 'targetWeight', parseFloat(text) || 0)}
                          keyboardType="numeric"
                          placeholder="20"
                          placeholderTextColor="#9CA3AF"
                          selectTextOnFocus={true}
                        />
                      </View>
                      <View style={styles.inputGroupImproved}>
                        <Text style={styles.setInputLabelImproved}>
                          {editingExercise.intensityType} (0-{editingExercise.intensityType === 'RIR' ? '5' : '10'})
                        </Text>
                        <TextInput
                          style={styles.setInputImproved}
                          value={set.intensity?.toString() || ''}
                          onChangeText={(text) => {
                            const value = parseInt(text) || 0;
                            const maxValue = editingExercise.intensityType === 'RIR' ? 5 : 10;
                            const clampedValue = Math.min(Math.max(value, 0), maxValue);
                            updateSet(setIndex, 'intensity', clampedValue);
                          }}
                          keyboardType="number-pad"
                          placeholder={editingExercise.intensityType === 'RIR' ? '2' : '8'}
                          placeholderTextColor="#9CA3AF"
                          selectTextOnFocus={true}
                        />
                      </View>
                    </View>

                    <View style={styles.notesContainerImproved}>
                      <Text style={styles.setInputLabelImproved}>Notas (opcional)</Text>
                      <TextInput
                        style={styles.notesInputImproved}
                        value={set.notes || ''}
                        onChangeText={(text) => updateSet(setIndex, 'notes', text)}
                        placeholder="Ej: Serie de calentamiento, usar drop set..."
                        placeholderTextColor="#9CA3AF"
                        multiline={true}
                        numberOfLines={2}
                      />
                    </View>
                  </View>

                  <View style={styles.setPreview}>
                    <Text style={styles.setPreviewText}>
                      {set.targetRepsMin}-{set.targetRepsMax} reps × {set.targetWeight}kg 
                      {editingExercise.intensityType === 'RIR' ? ` (${set.intensity} RIR)` : ` (@${set.intensity} RPE)`}
                    </Text>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.quickAddButton}
                onPress={addSetToExercise}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color="#5E4B8B" />
                <Text style={styles.quickAddText}>Agregar otra serie</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
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
  // 🔥 NUEVO: Estilo para botón de duplicar
  duplicateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  duplicateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E4B8B',
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
    marginBottom: 20,
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
  exercisesCard: {
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  addButton: {
    backgroundColor: '#5E4B8B',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  exercisesList: {
    gap: 12,
  },
  exerciseItem: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  exerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5E4B8B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muscleChip: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  muscleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5E4B8B',
  },
  exerciseStats: {
    fontSize: 12,
    color: '#6B7280',
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.5,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  createButton: {
    backgroundColor: '#5E4B8B',
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 16,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 70
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
  modal: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    marginTop: 10,
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  modalBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#5E4B8B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  configCard: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  configRow: {
    flexDirection: 'row',
    gap: 16,
  },
  configItem: {
    flex: 1,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  configInputImproved: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  unitLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 8,
  },
  intensityToggleImproved: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  intensityButtonImproved: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  intensityButtonActiveImproved: {
    backgroundColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  intensityButtonTextImproved: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  intensityButtonTextActiveImproved: {
    color: 'white',
  },
  setsCard: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 20,
  },
  setsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  setsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  addSetButtonImproved: {
    backgroundColor: '#5E4B8B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addSetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  setItemImproved: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  setHeaderImproved: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  setNumberContainer: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  setNumberImproved: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5E4B8B',
  },
  removeSetButtonImproved: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setInputsGridImproved: {
    gap: 16,
  },
  inputRowImproved: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroupImproved: {
    flex: 1,
  },
  setInputLabelImproved: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  setInputImproved: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notesContainerImproved: {
    marginTop: 4,
  },
  notesInputImproved: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  setPreview: {
    backgroundColor: '#EDE9FE',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#5E4B8B',
  },
  setPreviewText: {
    fontSize: 14,
    color: '#5E4B8B',
    fontWeight: '500',
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E4B8B',
  },
});

export default CreateRoutineScreen;