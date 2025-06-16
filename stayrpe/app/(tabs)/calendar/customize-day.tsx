import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ExercisePickerModal, { Exercise } from '../../../components/ExercisePickerModal';

interface SetInfo {
  setId: number;
  setNumber: number;
  originalRepsMin: number;
  originalRepsMax: number;
  originalWeight: number;
  originalRir?: number;
  originalRpe?: number;
  originalNotes?: string;
  customRepsMin?: number;
  customRepsMax?: number;
  customWeight?: number;
  customRir?: number;
  customRpe?: number;
  customNotes?: string;
  effectiveRepsMin: number;
  effectiveRepsMax: number;
  effectiveWeight: number;
  effectiveRir?: number;
  effectiveRpe?: number;
  effectiveNotes?: string;
  isCustomized: boolean;
  isAddedSet?: boolean;
  // Nueva propiedad para series añadidas a ejercicios originales
  isExtraSet?: boolean;
}

interface ExerciseCustomization {
  routineExerciseId: number;
  exerciseId: number;
  exerciseName: string;
  exerciseMuscle: string;
  order: number;
  numberOfSets: number;
  restBetweenSets?: number;
  exerciseNotes?: string;
  sets: SetInfo[];
  hasCustomizedSets: boolean;
  customizedSetsCount: number;
  isAddedExercise?: boolean;
  isRemovedExercise?: boolean;
  isOriginalExercise?: boolean;
  // Nueva propiedad para contar series eliminadas
  removedSetsCount?: number;
  addedSetsCount?: number;
}

interface DayCustomizationResponse {
  absoluteDay: number;
  actualDate: string;
  routineName: string;
  routineDescription?: string;
  hasCustomizations: boolean;
  totalCustomizations: number;
  exercises: ExerciseCustomization[];
  removedExercisesCount?: number;
  addedExercisesCount?: number;
}

interface SetCustomization {
  exerciseSetId: number;
  customRepsMin?: number;
  customRepsMax?: number;
  customWeight?: number;
  customRir?: number;
  customRpe?: number;
  customNotes?: string;
}

interface AddedExercise {
  exerciseId: number;
  order: number;
  numberOfSets: number;
  restBetweenSets?: number;
  notes?: string;
  sets: AddedSet[];
}

interface AddedSet {
  setNumber: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeight: number;
  rir?: number;
  rpe?: number;
  notes?: string;
}

interface EditingSet {
  setInfo: SetInfo;
  exerciseIndex: number;
  setIndex: number;
  exerciseName: string;
}

const CustomizeDayScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const API_URL = 'http://192.168.0.32:8080';
  const macrocycleId = params.macrocycleId as string;
  const absoluteDay = parseInt(params.absoluteDay as string);
  const routineName = params.routineName as string;

  const [dayData, setDayData] = useState<DayCustomizationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Estados para editar series
  const [editingSet, setEditingSet] = useState<EditingSet | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [tempRepsMin, setTempRepsMin] = useState('');
  const [tempRepsMax, setTempRepsMax] = useState('');
  const [tempWeight, setTempWeight] = useState('');
  const [tempIntensity, setTempIntensity] = useState('');
  const [tempNotes, setTempNotes] = useState('');
  const [intensityType, setIntensityType] = useState<'RIR' | 'RPE'>('RIR');

  // Estados para añadir ejercicios
  const [showExercisePickerModal, setShowExercisePickerModal] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<Exercise | null>(null);
  const [addExerciseOrder, setAddExerciseOrder] = useState('');
  const [addExerciseNotes, setAddExerciseNotes] = useState('');
  const [addExerciseRestTime, setAddExerciseRestTime] = useState('60');
  const [addExerciseSets, setAddExerciseSets] = useState<AddedSet[]>([]);

  // Estado para ejercicios eliminados (solo guardamos los IDs)
  const [removedExerciseIds, setRemovedExerciseIds] = useState<number[]>([]);

  // Nuevos estados para series eliminadas
  const [removedSetIds, setRemovedSetIds] = useState<number[]>([]);

  const [showInfoCard, setShowInfoCard] = useState(true);

  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      setToken(storedToken);
    };
    getToken();
  }, []);

  useEffect(() => {
    const loadInfoCardPreference = async () => {
      try {
        const hideInfoCard = await AsyncStorage.getItem('hideCustomizationInfo');
        if (hideInfoCard === 'true') {
          setShowInfoCard(false);
        }
      } catch (error) {
        console.log('Error loading info card preference:', error);
      }
    };
    loadInfoCardPreference();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (token && macrocycleId && absoluteDay) {
        loadDayData();
      }
    }, [token, macrocycleId, absoluteDay])
  );

  const loadDayData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/macrocycles/${macrocycleId}/days/${absoluteDay}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
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
        setDayData(data);
        // Reset removed exercises and sets when reloading
        setRemovedExerciseIds([]);
        setRemovedSetIds([]);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'No se pudo cargar la información del día');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getUsedExerciseIds = (): number[] => {
    if (!dayData) return [];
    
    const originalExerciseIds = dayData.exercises
      .filter(ex => ex.isOriginalExercise !== false)
      .map(ex => ex.exerciseId);
    
    const addedExerciseIds = dayData.exercises
      .filter(ex => ex.isAddedExercise === true)
      .map(ex => ex.exerciseId);
    
    return [...originalExerciseIds, ...addedExerciseIds];
  };

  const handleAddExercise = () => {
    setShowExercisePickerModal(true);
  };

  const handleExerciseSelected = (exercise: Exercise) => {
    setSelectedExerciseToAdd(exercise);
    setShowExercisePickerModal(false);
    
    // Calcular el siguiente orden
    const maxOrder = dayData?.exercises.reduce((max, ex) => Math.max(max, ex.order), 0) || 0;
    setAddExerciseOrder((maxOrder + 1).toString());
    
    // Configurar series por defecto
    const defaultSets: AddedSet[] = [
      {
        setNumber: 1,
        targetRepsMin: 8,
        targetRepsMax: 12,
        targetWeight: 20,
        rir: 2,
        notes: ''
      },
      {
        setNumber: 2,
        targetRepsMin: 8,
        targetRepsMax: 12,
        targetWeight: 20,
        rir: 2,
        notes: ''
      },
      {
        setNumber: 3,
        targetRepsMin: 8,
        targetRepsMax: 12,
        targetWeight: 20,
        rir: 2,
        notes: ''
      }
    ];
    
    setAddExerciseSets(defaultSets);
    setAddExerciseNotes('');
    setAddExerciseRestTime('60');
    setShowAddExerciseModal(true);
  };

  const handleSaveAddedExercise = () => {
    if (!selectedExerciseToAdd || !dayData) return;

    const order = parseInt(addExerciseOrder);
    if (isNaN(order) || order <= 0) {
      Alert.alert('Error', 'El orden debe ser un número mayor a 0');
      return;
    }

    const restTime = parseInt(addExerciseRestTime);
    if (isNaN(restTime) || restTime < 0) {
      Alert.alert('Error', 'El tiempo de descanso debe ser un número mayor o igual a 0');
      return;
    }

    // Validar series
    for (const set of addExerciseSets) {
      if (set.targetRepsMin <= 0 || set.targetRepsMax <= 0 || set.targetRepsMin > set.targetRepsMax) {
        Alert.alert('Error', 'Las repeticiones deben ser válidas');
        return;
      }
      if (set.targetWeight < 0) {
        Alert.alert('Error', 'El peso debe ser mayor o igual a 0');
        return;
      }
    }

    // Crear nuevo ejercicio
    const newExercise: ExerciseCustomization = {
      routineExerciseId: -Date.now(), // ID temporal negativo
      exerciseId: selectedExerciseToAdd.id,
      exerciseName: selectedExerciseToAdd.name,
      exerciseMuscle: selectedExerciseToAdd.muscle,
      order: order,
      numberOfSets: addExerciseSets.length,
      restBetweenSets: restTime,
      exerciseNotes: addExerciseNotes.trim() || undefined,
      sets: addExerciseSets.map(set => ({
        setId: -Date.now() - set.setNumber, // ID temporal negativo
        setNumber: set.setNumber,
        originalRepsMin: set.targetRepsMin,
        originalRepsMax: set.targetRepsMax,
        originalWeight: set.targetWeight,
        originalRir: set.rir,
        originalRpe: set.rpe,
        originalNotes: set.notes,
        effectiveRepsMin: set.targetRepsMin,
        effectiveRepsMax: set.targetRepsMax,
        effectiveWeight: set.targetWeight,
        effectiveRir: set.rir,
        effectiveRpe: set.rpe,
        effectiveNotes: set.notes,
        isCustomized: false,
        isAddedSet: true
      })),
      hasCustomizedSets: false,
      customizedSetsCount: 0,
      isAddedExercise: true,
      isOriginalExercise: false,
      removedSetsCount: 0,
      addedSetsCount: 0
    };

    // Añadir ejercicio a la lista
    const newDayData = { ...dayData };
    newDayData.exercises.push(newExercise);
    
    // Reordenar ejercicios por orden
    newDayData.exercises.sort((a, b) => a.order - b.order);
    
    // Actualizar contadores
    newDayData.addedExercisesCount = (newDayData.addedExercisesCount || 0) + 1;
    newDayData.hasCustomizations = true;

    setDayData(newDayData);
    setHasUnsavedChanges(true);
    setShowAddExerciseModal(false);
    setSelectedExerciseToAdd(null);
  };

  const handleRemoveExercise = (exercise: ExerciseCustomization) => {
    if (!dayData) return;

    Alert.alert(
      'Eliminar Ejercicio',
      `¿Estás seguro de que quieres eliminar "${exercise.exerciseName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            if (exercise.isAddedExercise) {
              // Si es un ejercicio agregado, simplemente lo quitamos de la lista
              const newDayData = { ...dayData };
              newDayData.exercises = newDayData.exercises.filter(ex => ex.routineExerciseId !== exercise.routineExerciseId);
              newDayData.addedExercisesCount = Math.max(0, (newDayData.addedExercisesCount || 0) - 1);
              setDayData(newDayData);
            } else {
              // Si es un ejercicio original, lo marcamos como eliminado
              setRemovedExerciseIds([...removedExerciseIds, exercise.exerciseId]);
            }
            setHasUnsavedChanges(true);
          }
        }
      ]
    );
  };

  // Nueva función para añadir serie a un ejercicio existente
  const handleAddSetToExercise = (exerciseIndex: number) => {
    if (!dayData) return;

    const newDayData = { ...dayData };
    const exercise = newDayData.exercises[exerciseIndex];
    
    // Calcular el siguiente número de serie
    const maxSetNumber = exercise.sets.reduce((max, set) => Math.max(max, set.setNumber), 0);
    const newSetNumber = maxSetNumber + 1;

    // Usar los valores de la última serie como referencia
    const lastSet = exercise.sets[exercise.sets.length - 1];
    
    const newSet: SetInfo = {
      setId: -Date.now() - newSetNumber, // ID temporal negativo
      setNumber: newSetNumber,
      originalRepsMin: lastSet.effectiveRepsMin,
      originalRepsMax: lastSet.effectiveRepsMax,
      originalWeight: lastSet.effectiveWeight,
      originalRir: lastSet.effectiveRir,
      originalRpe: lastSet.effectiveRpe,
      originalNotes: '',
      effectiveRepsMin: lastSet.effectiveRepsMin,
      effectiveRepsMax: lastSet.effectiveRepsMax,
      effectiveWeight: lastSet.effectiveWeight,
      effectiveRir: lastSet.effectiveRir,
      effectiveRpe: lastSet.effectiveRpe,
      effectiveNotes: '',
      isCustomized: false,
      isExtraSet: true // Nueva serie añadida a ejercicio original
    };

    exercise.sets.push(newSet);
    exercise.numberOfSets = exercise.sets.filter(set => !removedSetIds.includes(set.setId)).length;
    exercise.addedSetsCount = (exercise.addedSetsCount || 0) + 1;

    setDayData(newDayData);
    setHasUnsavedChanges(true);
  };

  // Nueva función para eliminar serie de un ejercicio
  const handleRemoveSetFromExercise = (exerciseIndex: number, setIndex: number) => {
    if (!dayData) return;

    const exercise = dayData.exercises[exerciseIndex];
    const setToRemove = exercise.sets[setIndex];

    // No permitir eliminar si solo queda una serie
    const visibleSets = exercise.sets.filter(set => !removedSetIds.includes(set.setId));
    if (visibleSets.length <= 1) {
      Alert.alert('Error', 'Un ejercicio debe tener al menos una serie');
      return;
    }

    Alert.alert(
      'Eliminar Serie',
      `¿Estás seguro de que quieres eliminar la serie ${setToRemove.setNumber}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            if (setToRemove.isAddedSet || setToRemove.isExtraSet) {
              // Si es una serie agregada, la quitamos de la lista
              const newDayData = { ...dayData };
              const exercise = newDayData.exercises[exerciseIndex];
              exercise.sets = exercise.sets.filter((_, index) => index !== setIndex);
              
              // Renumerar las series
              exercise.sets.forEach((set, index) => {
                set.setNumber = index + 1;
              });
              
              exercise.numberOfSets = exercise.sets.length;
              exercise.addedSetsCount = Math.max(0, (exercise.addedSetsCount || 0) - 1);
              
              setDayData(newDayData);
            } else {
              // Si es una serie original, la marcamos como eliminada
              setRemovedSetIds([...removedSetIds, setToRemove.setId]);
              
              const newDayData = { ...dayData };
              const exercise = newDayData.exercises[exerciseIndex];
              exercise.numberOfSets = exercise.sets.filter(set => !removedSetIds.includes(set.setId) && set.setId !== setToRemove.setId).length;
              exercise.removedSetsCount = (exercise.removedSetsCount || 0) + 1;
              
              setDayData(newDayData);
            }
            setHasUnsavedChanges(true);
          }
        }
      ]
    );
  };

  const updateAddedExerciseSet = (setIndex: number, field: keyof AddedSet, value: any) => {
    const newSets = [...addExerciseSets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
    setAddExerciseSets(newSets);
  };

  const addSetToNewExercise = () => {
    const newSet: AddedSet = {
      setNumber: addExerciseSets.length + 1,
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetWeight: 20,
      rir: 2,
      notes: ''
    };
    setAddExerciseSets([...addExerciseSets, newSet]);
  };

  const removeSetFromNewExercise = (setIndex: number) => {
    if (addExerciseSets.length <= 1) return;
    
    const newSets = addExerciseSets.filter((_, index) => index !== setIndex);
    // Renumerar las series
    const renumberedSets = newSets.map((set, index) => ({
      ...set,
      setNumber: index + 1
    }));
    setAddExerciseSets(renumberedSets);
  };

  const handleSaveChanges = async () => {
    if (!dayData || !token) return;
    
    try {
      setSaving(true);

      // Obtener customizaciones de series (excluyendo las eliminadas y las que son de ejercicios agregados)
      const setCustomizations: SetCustomization[] = [];
      
      dayData.exercises.forEach((exercise) => {
        if (!exercise.isAddedExercise) {
          exercise.sets.forEach((setInfo) => {
            if (!setInfo.isAddedSet && !setInfo.isExtraSet && !removedSetIds.includes(setInfo.setId)) {
              const customization: SetCustomization = {
                exerciseSetId: setInfo.setId,
                customRepsMin: setInfo.customRepsMin,
                customRepsMax: setInfo.customRepsMax,
                customWeight: setInfo.customWeight,
                customRir: setInfo.customRir,
                customRpe: setInfo.customRpe,
                customNotes: setInfo.customNotes,
              };
              
              if (!setInfo.setId || setInfo.setId < 0) {
                console.warn('⚠️ WARNING: setId es inválido para serie original');
                return;
              }
              
              setCustomizations.push(customization);
            }
          });
        }
      });

      // Obtener ejercicios agregados (incluyendo series extra añadidas a ejercicios originales)
      const addedExercises: AddedExercise[] = [];
      
      // Ejercicios completamente nuevos
      const newExercises = dayData.exercises
        .filter(ex => ex.isAddedExercise)
        .map(ex => ({
          exerciseId: ex.exerciseId,
          order: ex.order,
          numberOfSets: ex.numberOfSets,
          restBetweenSets: ex.restBetweenSets,
          notes: ex.exerciseNotes,
          sets: ex.sets.map(set => ({
            setNumber: set.setNumber,
            targetRepsMin: set.originalRepsMin,
            targetRepsMax: set.originalRepsMax,
            targetWeight: set.originalWeight,
            rir: set.originalRir,
            rpe: set.originalRpe,
            notes: set.originalNotes
          }))
        }));

      addedExercises.push(...newExercises);

      // Series extra añadidas a ejercicios originales
      dayData.exercises.forEach(exercise => {
        if (!exercise.isAddedExercise) {
          const extraSets = exercise.sets.filter(set => set.isExtraSet);
          if (extraSets.length > 0) {
            addedExercises.push({
              exerciseId: exercise.exerciseId,
              order: exercise.order,
              numberOfSets: extraSets.length,
              restBetweenSets: exercise.restBetweenSets,
              notes: `Series adicionales para ${exercise.exerciseName}`,
              sets: extraSets.map(set => ({
                setNumber: set.setNumber,
                targetRepsMin: set.originalRepsMin,
                targetRepsMax: set.originalRepsMax,
                targetWeight: set.originalWeight,
                rir: set.originalRir,
                rpe: set.originalRpe,
                notes: set.originalNotes
              }))
            });
          }
        }
      });

      const requestData = {
        absoluteDay: dayData.absoluteDay,
        setCustomizations: setCustomizations,
        addedExercises: addedExercises,
        removedExerciseIds: removedExerciseIds,
        removedSetIds: removedSetIds // Nuevo campo para series eliminadas
      };

      console.log('🚀 Enviando datos:', requestData);

      const response = await fetch(
        `${API_URL}/macrocycles/${macrocycleId}/days/${absoluteDay}/customize`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        }
      );

      if (response.status === 401) {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("onboardingComplete");
        Alert.alert("Sesión Expirada", "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", [
          { text: "OK", onPress: () => router.replace("/") }
        ]);
        return;
      }

      if (response.ok) {
        setHasUnsavedChanges(false);
        setRemovedExerciseIds([]);
        setRemovedSetIds([]);
        
        Alert.alert(
          'Cambios Guardados',
          'Se han guardado todos los cambios correctamente.',
          [{ text: 'Vale' }]
        );
        
        setTimeout(() => {
          loadDayData();
        }, 1500);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'No se pudieron guardar los cambios');
      }
    } catch (error) {
      console.error('Error guardando cambios:', error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  };

  // Resto de funciones existentes (handleEditSet, handleSaveSetEdit, etc.)
  const handleEditSet = (setInfo: SetInfo, exerciseIndex: number, setIndex: number, exerciseName: string) => {
    setEditingSet({ setInfo, exerciseIndex, setIndex, exerciseName });

    setTempRepsMin(setInfo.effectiveRepsMin?.toString() || '');
    setTempRepsMax(setInfo.effectiveRepsMax?.toString() || '');
    setTempWeight(setInfo.effectiveWeight?.toString() || '');
    setTempNotes(setInfo.effectiveNotes || '');

    if (setInfo.effectiveRpe !== undefined && setInfo.effectiveRpe !== null && setInfo.effectiveRpe >= 1) {
      setIntensityType('RPE');
      setTempIntensity(setInfo.effectiveRpe.toString());
    } else if (setInfo.effectiveRir !== undefined && setInfo.effectiveRir !== null && setInfo.effectiveRir >= 0) {
      setIntensityType('RIR');
      setTempIntensity(setInfo.effectiveRir.toString());
    } else {
      setIntensityType('RIR');
      setTempIntensity('2');
    }
    
    setShowEditModal(true);
  };

  const handleSaveSetEdit = () => {
    if (!editingSet || !dayData) return;
    
    const { exerciseIndex, setIndex } = editingSet;
    const repsMin = parseInt(tempRepsMin);
    const repsMax = parseInt(tempRepsMax);
    const weight = parseFloat(tempWeight);
    const intensity = parseInt(tempIntensity);

    if (isNaN(repsMin) || repsMin <= 0) {
      Alert.alert('Error', 'Las repeticiones mínimas deben ser un número mayor a 0');
      return;
    }
    if (isNaN(repsMax) || repsMax <= 0) {
      Alert.alert('Error', 'Las repeticiones máximas deben ser un número mayor a 0');
      return;
    }
    if (repsMin > repsMax) {
      Alert.alert('Error', 'Las repeticiones mínimas no pueden ser mayores que las máximas');
      return;
    }
    if (isNaN(weight) || weight < 0) {
      Alert.alert('Error', 'El peso debe ser un número mayor o igual a 0');
      return;
    }
    if (isNaN(intensity) || intensity < 0) {
      Alert.alert('Error', 'La intensidad debe ser un número válido');
      return;
    }
    if (intensityType === 'RIR' && intensity > 5) {
      Alert.alert('Error', 'El RIR debe estar entre 0 y 5');
      return;
    }
    if (intensityType === 'RPE' && (intensity < 1 || intensity > 10)) {
      Alert.alert('Error', 'El RPE debe estar entre 1 y 10');
      return;
    }

    const newDayData = JSON.parse(JSON.stringify(dayData));
    const exercise = newDayData.exercises[exerciseIndex];
    const setInfo = exercise.sets[setIndex];

    setInfo.customRepsMin = repsMin;
    setInfo.customRepsMax = repsMax;
    setInfo.customWeight = weight;
    setInfo.customNotes = tempNotes.trim() || undefined;

    if (intensityType === 'RIR') {
      setInfo.customRir = intensity;
      setInfo.customRpe = null;
    } else {
      setInfo.customRpe = intensity;
      setInfo.customRir = null;
    }

    setInfo.effectiveRepsMin = repsMin;
    setInfo.effectiveRepsMax = repsMax;
    setInfo.effectiveWeight = weight;

    if (intensityType === 'RIR') {
      setInfo.effectiveRir = intensity;
      setInfo.effectiveRpe = setInfo.originalRpe;
    } else {
      setInfo.effectiveRpe = intensity;
      setInfo.effectiveRir = setInfo.originalRir;
    }

    setInfo.effectiveNotes = tempNotes.trim() || setInfo.originalNotes;
    setInfo.isCustomized = true;

    exercise.customizedSetsCount = exercise.sets.filter(s => s.isCustomized).length;
    exercise.hasCustomizedSets = exercise.customizedSetsCount > 0;

    const totalCustomizations = newDayData.exercises.reduce((total, ex) =>
      total + ex.sets.filter(s => s.isCustomized).length, 0);

    newDayData.totalCustomizations = totalCustomizations;
    newDayData.hasCustomizations = totalCustomizations > 0;

    setDayData(newDayData);
    setHasUnsavedChanges(true);
    setShowEditModal(false);
    setEditingSet(null);
  };

  const handleResetAllCustomizations = () => {
    if (!dayData || (!dayData.hasCustomizations && removedExerciseIds.length === 0 && removedSetIds.length === 0)) return;
    
    Alert.alert(
      'Resetear Todo',
      '¿Estás seguro de que quieres resetear todas las customizaciones, ejercicios y series agregadas/eliminadas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetear Todo',
          style: 'destructive',
          onPress: () => {
            const newDayData = JSON.parse(JSON.stringify(dayData));
            
            // Resetear series customizadas
            newDayData.exercises.forEach(exercise => {
              if (!exercise.isAddedExercise) {
                exercise.sets = exercise.sets.filter(set => !set.isExtraSet);
                exercise.sets.forEach(setInfo => {
                  setInfo.customRepsMin = undefined;
                  setInfo.customRepsMax = undefined;
                  setInfo.customWeight = undefined;
                  setInfo.customRir = undefined;
                  setInfo.customRpe = undefined;
                  setInfo.customNotes = undefined;
                  setInfo.effectiveRepsMin = setInfo.originalRepsMin;
                  setInfo.effectiveRepsMax = setInfo.originalRepsMax;
                  setInfo.effectiveWeight = setInfo.originalWeight;
                  setInfo.effectiveRir = setInfo.originalRir;
                  setInfo.effectiveRpe = setInfo.originalRpe;
                  setInfo.effectiveNotes = setInfo.originalNotes;
                  setInfo.isCustomized = false;
                });
                exercise.customizedSetsCount = 0;
                exercise.hasCustomizedSets = false;
                exercise.removedSetsCount = 0;
                exercise.addedSetsCount = 0;
              }
            });
            
            // Eliminar ejercicios agregados
            newDayData.exercises = newDayData.exercises.filter(ex => !ex.isAddedExercise);
            
            // Reset contadores
            newDayData.totalCustomizations = 0;
            newDayData.hasCustomizations = false;
            newDayData.addedExercisesCount = 0;
            newDayData.removedExercisesCount = 0;
            
            setDayData(newDayData);
            setRemovedExerciseIds([]);
            setRemovedSetIds([]);
            setHasUnsavedChanges(true);
          }
        }
      ]
    );
  };

  const handleBackPress = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Cambios sin guardar',
        '¿Estás seguro de que quieres salir? Se perderán los cambios no guardados.',
        [
          { text: 'Continuar editando', style: 'cancel' },
          { text: 'Salir y descartar cambios', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  const handleCloseInfoCard = async () => {
    try {
      await AsyncStorage.setItem('hideCustomizationInfo', 'true');
      setShowInfoCard(false);
    } catch (error) {
      console.log('Error saving info card preference:', error);
      setShowInfoCard(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    } catch {
      return dateString;
    }
  };

  const getIntensityLabel = (setInfo: SetInfo) => {
    if (setInfo.isCustomized) {
      if (setInfo.effectiveRpe !== undefined && setInfo.effectiveRpe !== null && setInfo.effectiveRpe >= 1) {
        return `@${setInfo.effectiveRpe} RPE`;
      }
      if (setInfo.effectiveRir !== undefined && setInfo.effectiveRir !== null && setInfo.effectiveRir >= 0) {
        return `${setInfo.effectiveRir} RIR`;
      }
    } else {
      if (setInfo.effectiveRir !== undefined && setInfo.effectiveRir !== null && setInfo.effectiveRir >= 0) {
        return `${setInfo.effectiveRir} RIR`;
      }
      if (setInfo.effectiveRpe !== undefined && setInfo.effectiveRpe !== null && setInfo.effectiveRpe >= 1) {
        return `@${setInfo.effectiveRpe} RPE`;
      }
    }
    return null;
  };

  const renderSetCard = (setInfo: SetInfo, exerciseIndex: number, setIndex: number, exerciseName: string, exercise: ExerciseCustomization) => {
    const intensityLabel = getIntensityLabel(setInfo);
    
    const isActuallyCustomized = setInfo.isCustomized !== undefined 
      ? setInfo.isCustomized 
      : !!(setInfo.customRepsMin || setInfo.customRepsMax || setInfo.customWeight || setInfo.customRir || setInfo.customRpe || setInfo.customNotes);
    
    const isSetRemoved = removedSetIds.includes(setInfo.setId);
    
    if (isSetRemoved) {
      return (
        <View key={setInfo.setId} style={[styles.setCard, styles.setCardRemoved]}>
          <View style={styles.setHeader}>
            <View style={styles.setNumberContainer}>
              <Text style={[styles.setNumber, styles.setNumberRemoved]}>Serie {setInfo.setNumber}</Text>
              <View style={styles.removedBadge}>
                <Text style={styles.removedBadgeText}>Eliminada</Text>
              </View>
            </View>
          </View>
          <View style={styles.setContent}>
            <Text style={[styles.setDescription, styles.setDescriptionRemoved]}>
              {setInfo.effectiveRepsMin === setInfo.effectiveRepsMax
                ? `${setInfo.effectiveRepsMin} reps`
                : `${setInfo.effectiveRepsMin}-${setInfo.effectiveRepsMax} reps`
              } × {setInfo.effectiveWeight}kg
              {intensityLabel && ` (${intensityLabel})`}
            </Text>
          </View>
        </View>
      );
    }
    
    return (
      <View key={setInfo.setId} style={styles.setCard}>
        <View style={styles.setHeader}>
          <View style={styles.setNumberContainer}>
            <Text style={styles.setNumber}>Serie {setInfo.setNumber}</Text>
            {isActuallyCustomized && (
              <View style={styles.editedBadge}>
                <Text style={styles.editedBadgeText}>Editada</Text>
              </View>
            )}
            {setInfo.isAddedSet && (
              <View style={styles.addedBadge}>
                <Text style={styles.addedBadgeText}>Nueva</Text>
              </View>
            )}
            {setInfo.isExtraSet && (
              <View style={styles.extraBadge}>
                <Text style={styles.extraBadgeText}>Extra</Text>
              </View>
            )}
          </View>
          <View style={styles.setActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditSet(setInfo, exerciseIndex, setIndex, exerciseName)}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={16} color="#5E4B8B" />
              <Text style={styles.editButtonText}>Editar</Text>
            </TouchableOpacity>
            
          </View>
        </View>
        
        <View style={styles.setContent}>
          <View style={styles.setInfo}>
            <Text style={styles.setDescription}>
              {setInfo.effectiveRepsMin === setInfo.effectiveRepsMax
                ? `${setInfo.effectiveRepsMin} reps`
                : `${setInfo.effectiveRepsMin}-${setInfo.effectiveRepsMax} reps`
              } × {setInfo.effectiveWeight}kg
              {intensityLabel && ` (${intensityLabel})`}
            </Text>
            {setInfo.effectiveNotes && (
              <Text style={styles.setNotes}>{setInfo.effectiveNotes}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderExerciseCard = (exercise: ExerciseCustomization, exerciseIndex: number) => {
    const isRemoved = removedExerciseIds.includes(exercise.exerciseId);
    const visibleSets = exercise.sets.filter(set => !removedSetIds.includes(set.setId));
    
    return (
      <View key={exercise.routineExerciseId} style={[
        styles.exerciseCard,
        isRemoved && styles.exerciseCardRemoved
      ]}>
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseNumberContainer}>
            <Text style={styles.exerciseNumber}>{exercise.order}</Text>
          </View>
          <View style={styles.exerciseInfo}>
            <View style={styles.exerciseNameRow}>
              <Text style={[
                styles.exerciseName,
                isRemoved && styles.exerciseNameRemoved
              ]}>
                {exercise.exerciseName}
              </Text>
              
            </View>
            <View style={styles.exerciseMeta}>
              <View style={styles.muscleChip}>
                <Text style={styles.muscleText}>{exercise.exerciseMuscle}</Text>
              </View>
              <Text style={styles.setsCount}>
                {visibleSets.length} series
              </Text>
              {exercise.hasCustomizedSets && (
                <View style={styles.customizedSetsIndicator}>
                  <Text style={styles.customizedSetsText}>
                    {exercise.customizedSetsCount} editada{exercise.customizedSetsCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              {exercise.isAddedExercise && (
                <View style={styles.addedExerciseIndicator}>
                  <Text style={styles.addedExerciseText}>Agregado</Text>
                </View>
              )}
              {exercise.addedSetsCount > 0 && (
                <View style={styles.addedSetsIndicator}>
                  <Text style={styles.addedSetsText}>+{exercise.addedSetsCount} series</Text>
                </View>
              )}
              {exercise.removedSetsCount > 0 && (
                <View style={styles.removedSetsIndicator}>
                  <Text style={styles.removedSetsText}>-{exercise.removedSetsCount} series</Text>
                </View>
              )}
              {isRemoved && (
                <View style={styles.removedExerciseIndicator}>
                  <Text style={styles.removedExerciseText}>Eliminado</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        {exercise.exerciseNotes && (
          <View style={styles.exerciseNotesContainer}>
            <Ionicons name="information-circle" size={14} color="#6B7280" />
            <Text style={styles.exerciseNotesText}>{exercise.exerciseNotes}</Text>
          </View>
        )}
        
        {!isRemoved && (
          <>
            <View style={styles.setsContainer}>
              {exercise.sets.map((setInfo, setIndex) =>
                renderSetCard(setInfo, exerciseIndex, setIndex, exercise.exerciseName, exercise)
              )}
            </View>
            
            
          </>
        )}
      </View>
    );
  };

  const renderAddExerciseModal = () => {
    if (!selectedExerciseToAdd) return null;

    return (
      <Modal
        visible={showAddExerciseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddExerciseModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Añadir Ejercicio</Text>
                  <Text style={styles.modalSubtitle}>{selectedExerciseToAdd.name}</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowAddExerciseModal(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.inputSection}>
                  <Text style={styles.sectionTitle}>Posición en la rutina</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Orden de ejecución</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={addExerciseOrder}
                      onChangeText={setAddExerciseOrder}
                      placeholder="1"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      selectTextOnFocus={true}
                    />
                  </View>
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.sectionTitle}>Tiempo de descanso</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Segundos entre series</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={addExerciseRestTime}
                      onChangeText={setAddExerciseRestTime}
                      placeholder="60"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      selectTextOnFocus={true}
                    />
                  </View>
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.sectionTitle}>Notas del ejercicio (opcional)</Text>
                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.textAreaInput}
                      value={addExerciseNotes}
                      onChangeText={setAddExerciseNotes}
                      placeholder="Ej: Técnica específica, variación del ejercicio..."
                      placeholderTextColor="#9CA3AF"
                      multiline={true}
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                <View style={styles.inputSection}>
                  <View style={styles.setsHeaderRow}>
                    <Text style={styles.sectionTitle}>Series ({addExerciseSets.length})</Text>
                    <TouchableOpacity
                      style={styles.addSetButtonInModal}
                      onPress={addSetToNewExercise}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle" size={20} color="#5E4B8B" />
                      <Text style={styles.addSetButtonTextInModal}>Añadir Serie</Text>
                    </TouchableOpacity>
                  </View>

                  {addExerciseSets.map((set, index) => (
                    <View key={index} style={styles.setConfigCard}>
                      <View style={styles.setConfigHeader}>
                        <Text style={styles.setConfigTitle}>Serie {set.setNumber}</Text>
                        {addExerciseSets.length > 1 && (
                          <TouchableOpacity
                            style={styles.removeSetButtonInModal}
                            onPress={() => removeSetFromNewExercise(index)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.setConfigRow}>
                        <View style={styles.setConfigInputGroup}>
                          <Text style={styles.setConfigLabel}>Reps Min</Text>
                          <TextInput
                            style={styles.setConfigInput}
                            value={set.targetRepsMin.toString()}
                            onChangeText={(text) => updateAddedExerciseSet(index, 'targetRepsMin', parseInt(text) || 0)}
                            keyboardType="number-pad"
                            selectTextOnFocus={true}
                          />
                        </View>
                        <View style={styles.setConfigInputGroup}>
                          <Text style={styles.setConfigLabel}>Reps Max</Text>
                          <TextInput
                            style={styles.setConfigInput}
                            value={set.targetRepsMax.toString()}
                            onChangeText={(text) => updateAddedExerciseSet(index, 'targetRepsMax', parseInt(text) || 0)}
                            keyboardType="number-pad"
                            selectTextOnFocus={true}
                          />
                        </View>
                        <View style={styles.setConfigInputGroup}>
                          <Text style={styles.setConfigLabel}>Peso (kg)</Text>
                          <TextInput
                            style={styles.setConfigInput}
                            value={set.targetWeight.toString()}
                            onChangeText={(text) => updateAddedExerciseSet(index, 'targetWeight', parseFloat(text) || 0)}
                            keyboardType="numeric"
                            selectTextOnFocus={true}
                          />
                        </View>
                        <View style={styles.setConfigInputGroup}>
                          <Text style={styles.setConfigLabel}>RIR</Text>
                          <TextInput
                            style={styles.setConfigInput}
                            value={set.rir?.toString() || ''}
                            onChangeText={(text) => updateAddedExerciseSet(index, 'rir', parseInt(text) || undefined)}
                            keyboardType="number-pad"
                            selectTextOnFocus={true}
                            placeholder="2"
                          />
                        </View>
                      </View>

                      <View style={styles.setConfigNotesRow}>
                        <TextInput
                          style={styles.setConfigNotesInput}
                          value={set.notes || ''}
                          onChangeText={(text) => updateAddedExerciseSet(index, 'notes', text)}
                          placeholder="Notas de la serie (opcional)"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAddExerciseModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveAddedExercise}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Añadir</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderEditModal = () => {
    if (!editingSet) return null;
    
    const { setInfo, exerciseName } = editingSet;
    const maxIntensity = intensityType === 'RIR' ? 5 : 10;
    const minIntensity = intensityType === 'RIR' ? 0 : 1;
    
    return (
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Editar Serie {setInfo.setNumber}</Text>
                  <Text style={styles.modalSubtitle}>{exerciseName}</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowEditModal(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.originalComparisonCard}>
                  <Text style={styles.originalComparisonTitle}>Valores originales:</Text>
                  <Text style={styles.originalComparisonText}>
                    {setInfo.originalRepsMin === setInfo.originalRepsMax
                      ? `${setInfo.originalRepsMin} reps`
                      : `${setInfo.originalRepsMin}-${setInfo.originalRepsMax} reps`
                    } × {setInfo.originalWeight}kg
                    {setInfo.originalRir && ` (${setInfo.originalRir} RIR)`}
                    {setInfo.originalRpe && ` (@${setInfo.originalRpe} RPE)`}
                  </Text>
                </View>
                
                <View style={styles.inputSection}>
                  <Text style={styles.sectionTitle}>Repeticiones</Text>
                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Mínimas</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={tempRepsMin}
                        onChangeText={setTempRepsMin}
                        placeholder={setInfo.originalRepsMin.toString()}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        selectTextOnFocus={true}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Máximas</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={tempRepsMax}
                        onChangeText={setTempRepsMax}
                        placeholder={setInfo.originalRepsMax.toString()}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        selectTextOnFocus={true}
                      />
                    </View>
                  </View>
                </View>
                
                <View style={styles.inputSection}>
                  <Text style={styles.sectionTitle}>Peso</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Kilogramos</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={tempWeight}
                      onChangeText={setTempWeight}
                      placeholder={setInfo.originalWeight.toString()}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      selectTextOnFocus={true}
                    />
                  </View>
                </View>
                
                {(setInfo.originalRir !== undefined || setInfo.originalRpe !== undefined) && (
                  <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle}>Intensidad</Text>
                    <View style={styles.intensityToggle}>
                      <TouchableOpacity
                        style={[
                          styles.intensityButton,
                          intensityType === 'RIR' && styles.intensityButtonActive
                        ]}
                        onPress={() => {
                          setIntensityType('RIR');
                          let newValue = '';
                          if (setInfo.customRir !== undefined && setInfo.customRir !== null) {
                            newValue = setInfo.customRir.toString();
                          } else if (setInfo.originalRir !== undefined && setInfo.originalRir !== null) {
                            newValue = setInfo.originalRir.toString();
                          } else {
                            newValue = '2';
                          }
                          setTempIntensity(newValue);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.intensityButtonText,
                          intensityType === 'RIR' && styles.intensityButtonTextActive
                        ]}>RIR</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.intensityButton,
                          intensityType === 'RPE' && styles.intensityButtonActive
                        ]}
                        onPress={() => {
                          setIntensityType('RPE');
                          let newValue = '';
                          if (setInfo.customRpe !== undefined && setInfo.customRpe !== null) {
                            newValue = setInfo.customRpe.toString();
                          } else if (setInfo.originalRpe !== undefined && setInfo.originalRpe !== null) {
                            newValue = setInfo.originalRpe.toString();
                          } else {
                            newValue = '8';
                          }
                          setTempIntensity(newValue);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.intensityButtonText,
                          intensityType === 'RPE' && styles.intensityButtonTextActive
                        ]}>RPE</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        {intensityType} ({minIntensity}-{maxIntensity})
                      </Text>
                      <TextInput
                        style={styles.numberInput}
                        value={tempIntensity}
                        onChangeText={setTempIntensity}
                        placeholder={intensityType === 'RIR' ? '2' : '8'}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        selectTextOnFocus={true}
                      />
                    </View>
                  </View>
                )}
                
                <View style={styles.inputSection}>
                  <Text style={styles.sectionTitle}>Notas (opcional)</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Notas específicas para esta serie</Text>
                    <TextInput
                      style={styles.textAreaInput}
                      value={tempNotes}
                      onChangeText={setTempNotes}
                      placeholder="Ej: Serie de calentamiento, usar drop set..."
                      placeholderTextColor="#9CA3AF"
                      multiline={true}
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
                
                <View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>Vista previa:</Text>
                  <Text style={styles.previewText}>
                    {tempRepsMin && tempRepsMax
                      ? (tempRepsMin === tempRepsMax
                          ? `${tempRepsMin} reps`
                          : `${tempRepsMin}-${tempRepsMax} reps`)
                      : '? reps'
                    } × {tempWeight || '?'}kg
                    {tempIntensity && ` (${intensityType === 'RIR' ? `${tempIntensity} RIR` : `@${tempIntensity} RPE`})`}
                  </Text>
                  {tempNotes.trim() && (
                    <Text style={styles.previewNotes}>Notas: {tempNotes.trim()}</Text>
                  )}
                </View>
              </ScrollView>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowEditModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveSetEdit}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E4B8B" />
          <Text style={styles.loadingText}>Cargando información del día...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dayData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Error al cargar</Text>
          <Text style={styles.errorSubtitle}>No se pudo cargar la información del día</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Filtrar ejercicios eliminados para mostrar
  const visibleExercises = dayData.exercises.filter(ex => 
    !removedExerciseIds.includes(ex.exerciseId) || ex.isAddedExercise
  );

  const totalExercises = visibleExercises.length;
  const totalSets = visibleExercises.reduce((total, ex) => {
    const visibleSetsInExercise = ex.sets.filter(set => !removedSetIds.includes(set.setId));
    return total + visibleSetsInExercise.length;
  }, 0);
  const totalCustomizations = dayData.totalCustomizations || 0;
  const hasAnyChanges = hasUnsavedChanges || totalCustomizations > 0 || 
                       dayData.addedExercisesCount > 0 || removedExerciseIds.length > 0 ||
                       removedSetIds.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              Día {dayData.absoluteDay} - Personalizar
            </Text>
            <Text style={styles.headerSubtitle}>
              {formatDate(dayData.actualDate)} • {dayData.routineName}
            </Text>
          </View>
          
          {hasUnsavedChanges && (
            <View style={styles.unsavedIndicator}>
              <View style={styles.unsavedDot} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="barbell" size={18} color="#5E4B8B" />
            </View>
            <Text style={styles.statLabel}>Ejercicios</Text>
            <Text style={styles.statValue}>{totalExercises}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="layers" size={18} color="#5E4B8B" />
            </View>
            <Text style={styles.statLabel}>Series totales</Text>
            <Text style={styles.statValue}>{totalSets}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="pencil" size={18} color="#5E4B8B" />
            </View>
            <Text style={styles.statLabel}>Editadas</Text>
            <Text style={styles.statValue}>{totalCustomizations}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dayData.exercises.map((exercise, exerciseIndex) =>
          renderExerciseCard(exercise, exerciseIndex)
        )}

        

        {showInfoCard && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color="#5E4B8B" />
              <Text style={styles.infoTitle}>¿Cómo funciona la personalización?</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>
                • Modifica solo las series que necesites ajustar{'\n'}
                • Añade o elimina ejercicios según tus necesidades{'\n'}
                • Añade o elimina series individuales de cada ejercicio{'\n'}
                • Los cambios solo afectan a este día específico{'\n'}
                • Puedes resetear todo o ejercicios individuales{'\n'}
                • Los valores originales de la rutina no se modifican
              </Text>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleCloseInfoCard}
                activeOpacity={0.8}
              >
                <Text style={styles.dismissButtonText}>Entendido, no mostrar más</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.actionButtonsInline}>
          {hasAnyChanges && (
            <TouchableOpacity
              style={styles.resetAllButton}
              onPress={handleResetAllCustomizations}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color="#5E4B8B" />
              <Text style={styles.resetAllButtonText}>Resetear Todo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.saveChangesButton,
              !hasUnsavedChanges && styles.saveChangesButtonDisabled
            ]}
            onPress={handleSaveChanges}
            disabled={!hasUnsavedChanges || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveChangesButtonText}>
                {hasUnsavedChanges ? 'Guardar Cambios' : 'Sin Cambios'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ExercisePickerModal
        visible={showExercisePickerModal}
        onClose={() => setShowExercisePickerModal(false)}
        onExerciseSelected={handleExerciseSelected}
        excludedExerciseIds={getUsedExerciseIds()}
        title="Añadir Ejercicio"
        subtitle="Selecciona un ejercicio para añadir al día"
      />

      {renderAddExerciseModal()}
      {renderEditModal()}
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
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  unsavedIndicator: {
    marginLeft: 8,
  },
  unsavedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5E4B8B',
  },
  statsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  exerciseCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  exerciseCardRemoved: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    opacity: 0.7,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5E4B8B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  exerciseNameRemoved: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  removeExerciseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
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
  setsCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  customizedSetsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  customizedSetsText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  addedExerciseIndicator: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  addedExerciseText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  addedSetsIndicator: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  addedSetsText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '600',
  },
  removedSetsIndicator: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  removedSetsText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  removedExerciseIndicator: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  removedExerciseText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  exerciseNotesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  exerciseNotesText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  setsContainer: {
    gap: 12,
    marginBottom: 12,
  },
  setCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  setCardRemoved: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    opacity: 0.6,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  setNumberRemoved: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  editedBadge: {
    backgroundColor: '#5E4B8B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  addedBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  extraBadge: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  extraBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  removedBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  setActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#5E4B8B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E4B8B',
  },
  removeSetButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setContent: {
    gap: 12,
  },
  setInfo: {
    gap: 4,
  },
  setDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  setDescriptionRemoved: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  setNotes: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  addSetIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E4B8B',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    gap: 12,
  },
  addExerciseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addExerciseContent: {
    flex: 1,
  },
  addExerciseText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5E4B8B',
    marginBottom: 2,
  },
  addExerciseSubtext: {
    fontSize: 14,
    color: '#8B7AB8',
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
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
  infoContent: {
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  dismissButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  dismissButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  actionButtonsInline: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  resetAllButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#5E4B8B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  resetAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E4B8B',
  },
  saveChangesButton: {
    backgroundColor: '#5E4B8B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    flex: 2,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveChangesButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveChangesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
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
  originalComparisonCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#6B7280',
  },
  originalComparisonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  originalComparisonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  numberInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
  },
  textAreaInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 80,
  },
  intensityToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  intensityButtonActive: {
    backgroundColor: '#5E4B8B',
  },
  intensityButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  intensityButtonTextActive: {
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
    marginBottom: 8,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5E4B8B',
    marginBottom: 4,
  },
  previewNotes: {
    fontSize: 14,
    color: '#7C3AED',
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
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
  saveButton: {
    backgroundColor: '#5E4B8B',
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Add Exercise Modal styles
  setsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addSetButtonInModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addSetButtonTextInModal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E4B8B',
  },
  setConfigCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  setConfigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setConfigTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  removeSetButtonInModal: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setConfigRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  setConfigInputGroup: {
    flex: 1,
  },
  setConfigLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  setConfigInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'center',
  },
  setConfigNotesRow: {
    marginTop: 8,
  },
  setConfigNotesInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
  },
});

export default CustomizeDayScreen;