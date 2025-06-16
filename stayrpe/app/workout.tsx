// workout.tsx - PANTALLA PRINCIPAL OPTIMIZADA Y LIMPIA
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import ExercisePickerModal, { Exercise } from '../components/ExercisePickerModal';
import ExerciseDetailScreen from './(tabs)/calendar/exercise-detail';

// =========================================================================
// INTERFACES
// =========================================================================
export interface ExerciseSet {
  id?: number;
  setNumber: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeight: number;
  rir?: number;
  rpe?: number;
  notes?: string;
  actualReps?: number;
  actualWeight?: number;
  actualRir?: number;
  actualRpe?: number;
  actualNotes?: string;
  completed: boolean;
  isNewSet?: boolean;
}

export interface WorkoutExercise {
  id: number;
  exerciseId: number;
  exerciseName: string;
  exerciseMuscle: string;
  order: number;
  numberOfSets: number;
  restBetweenSets?: number;
  notes?: string;
  sets: ExerciseSet[];
  completed: boolean;
  isNewExercise?: boolean;
}

export interface WorkoutData {
  id: number;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
}

interface CompleteWorkoutRequest {
  routineId?: number;
  routineName: string;
  routineDescription?: string;
  startedAt: string;
  completedAt: string;
  notes?: string;
  // 🔥 NUEVO: Campos para el macrociclo
  macrocycleId?: number;
  absoluteDay?: number;
  exercises: CompletedExercise[];
}

interface CompletedExercise {
  exerciseId: number;
  exerciseName: string;
  exerciseMuscle: string;
  exerciseOrder: number;
  restBetweenSets?: number;
  notes?: string;
  wasAddedDuringWorkout?: boolean;
  sets: CompletedSet[];
}

interface CompletedSet {
  setNumber: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetWeight?: number;
  targetRir?: number;
  targetRpe?: number;
  targetNotes?: string;
  actualReps?: number;
  actualWeight?: number;
  actualRir?: number;
  actualRpe?: number;
  actualNotes?: string;
  completed: boolean;
  wasAddedDuringWorkout?: boolean;
}

const WorkoutScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // =========================================================================
  // ESTADOS
  // =========================================================================
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'exercise' | 'overview'>('overview');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [workoutStartTime] = useState(new Date());
  const [isCustomizedWorkout, setIsCustomizedWorkout] = useState(false);
  const [macrocycleId, setMacrocycleId] = useState<string | null>(null);
  const [absoluteDay, setAbsoluteDay] = useState<string | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const loadingRef = useRef(false);
  const API_URL = 'http://192.168.0.32:8080';
  const routineId = params.routineId as string;
  const routineName = params.routineName as string;

  // =========================================================================
  // EFFECTS Y FUNCIONES PRINCIPALES
  // =========================================================================
  const detectCustomizedWorkout = useCallback(() => {
    const macrocycleIdParam = params.macrocycleId as string;
    const absoluteDayParam = params.absoluteDay as string;
    
    if (macrocycleIdParam && absoluteDayParam) {
      setIsCustomizedWorkout(true);
      setMacrocycleId(macrocycleIdParam);
      setAbsoluteDay(absoluteDayParam);
    } else {
      setIsCustomizedWorkout(false);
      setMacrocycleId(null);
      setAbsoluteDay(null);
    }
  }, [params.macrocycleId, params.absoluteDay, routineId]);

  useEffect(() => {
    detectCustomizedWorkout();
  }, [detectCustomizedWorkout]);

  useEffect(() => {
    let isMounted = true;
    
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        if (isMounted) {
          setToken(storedToken);
        }
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    
    getToken();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (token && routineId && !loadingRef.current) {
        loadRoutineDataWithProgressPreservation();
      }
    }, [token, routineId, isCustomizedWorkout, macrocycleId, absoluteDay])
  );

  const loadRoutineDataWithProgressPreservation = useCallback(async () => {
    if (!token || loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);
      
      const currentProgress = preserveWorkoutProgress();
      
      let workoutData: WorkoutData;
      
      if (isCustomizedWorkout && macrocycleId && absoluteDay) {
        workoutData = await loadCustomizedRoutine();
      } else {
        workoutData = await loadOriginalRoutine();
      }
      
      const workoutWithProgress = restoreWorkoutProgress(workoutData, currentProgress);
      setWorkout(workoutWithProgress);
      
    } catch (error) {
      console.error('Error al cargar rutina:', error);
      Alert.alert('Error', 'No se pudo cargar la rutina');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [token, isCustomizedWorkout, macrocycleId, absoluteDay]);

  const loadCustomizedRoutine = useCallback(async (): Promise<WorkoutData> => {
    if (!token || !macrocycleId || !absoluteDay) {
      throw new Error('Faltan datos para cargar rutina customizada');
    }

    const timestamp = Date.now();
    const response = await fetch(
      `${API_URL}/macrocycles/${macrocycleId}/days/${absoluteDay}?t=${timestamp}`, 
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }
    );

    if (response.status === 401) {
      await AsyncStorage.multiRemove(["token", "onboardingComplete"]);
      throw new Error('Sesión expirada');
    }

    if (!response.ok) {
      throw new Error('Error al cargar rutina customizada');
    }

    const dayData = await response.json();
    return convertCustomizationToWorkout(dayData);
  }, [token, macrocycleId, absoluteDay]);

  const loadOriginalRoutine = useCallback(async (): Promise<WorkoutData> => {
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const timestamp = Date.now();
    const response = await fetch(`${API_URL}/routines/${routineId}?t=${timestamp}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (response.status === 401) {
      await AsyncStorage.multiRemove(["token", "onboardingComplete"]);
      throw new Error('Sesión expirada');
    }

    if (!response.ok) {
      throw new Error('Error al cargar rutina original');
    }

    const data = await response.json();
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      exercises: data.exercises.map((exercise: any) => ({
        ...exercise,
        completed: false,
        sets: exercise.sets.map((set: any) => ({
          ...set,
          completed: false,
          actualReps: undefined,
          actualWeight: set.targetWeight,
          actualRir: undefined,
          actualRpe: undefined,
          actualNotes: undefined
        }))
      }))
    };
  }, [token, routineId]);

  const convertCustomizationToWorkout = useCallback((dayData: any): WorkoutData => {
    if (!dayData.exercises || dayData.exercises.length === 0) {
      throw new Error('No hay ejercicios en la rutina customizada');
    }

    const exercises = dayData.exercises.map((exercise: any) => ({
      id: exercise.routineExerciseId,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      exerciseMuscle: exercise.exerciseMuscle,
      order: exercise.order,
      numberOfSets: exercise.numberOfSets,
      restBetweenSets: exercise.restBetweenSets,
      notes: exercise.exerciseNotes,
      completed: false,
      sets: exercise.sets.map((setInfo: any) => {
        let rir = undefined;
        let rpe = undefined;
        
        if (setInfo.effectiveRpe !== undefined && setInfo.effectiveRpe !== null && setInfo.effectiveRpe >= 1) {
          rpe = setInfo.effectiveRpe;
        } else if (setInfo.effectiveRir !== undefined && setInfo.effectiveRir !== null && setInfo.effectiveRir >= 0) {
          rir = setInfo.effectiveRir;
        } else if (setInfo.originalRpe !== undefined && setInfo.originalRpe !== null && setInfo.originalRpe >= 1) {
          rpe = setInfo.originalRpe;
        } else if (setInfo.originalRir !== undefined && setInfo.originalRir !== null && setInfo.originalRir >= 0) {
          rir = setInfo.originalRir;
        }

        return {
          id: setInfo.setId,
          setNumber: setInfo.setNumber,
          targetRepsMin: setInfo.effectiveRepsMin,
          targetRepsMax: setInfo.effectiveRepsMax,
          targetWeight: setInfo.effectiveWeight,
          rir: rir,
          rpe: rpe,
          notes: setInfo.effectiveNotes,
          completed: false,
          actualReps: undefined,
          actualWeight: setInfo.effectiveWeight,
          actualRir: undefined,
          actualRpe: undefined,
          actualNotes: undefined
        };
      })
    }));

    return {
      id: parseInt(routineId),
      name: dayData.routineName,
      description: dayData.routineDescription,
      exercises: exercises
    };
  }, [routineId]);

  const preserveWorkoutProgress = useCallback(() => {
    if (!workout) return {};
    
    const progress: {[key: string]: any} = {};
    
    workout.exercises.forEach((exercise, exerciseIndex) => {
      const exerciseKey = `exercise_${exercise.exerciseId}_${exerciseIndex}`;
      progress[exerciseKey] = {
        completed: exercise.completed,
        sets: exercise.sets.map(set => ({
          setNumber: set.setNumber,
          completed: set.completed,
          actualReps: set.actualReps,
          actualWeight: set.actualWeight,
          actualRir: set.actualRir,
          actualRpe: set.actualRpe,
          actualNotes: set.actualNotes
        }))
      };
    });
    
    return progress;
  }, [workout]);

  const restoreWorkoutProgress = useCallback((freshWorkout: WorkoutData, savedProgress: {[key: string]: any}) => {
    if (Object.keys(savedProgress).length === 0) {
      return freshWorkout;
    }
    
    const workoutWithProgress = JSON.parse(JSON.stringify(freshWorkout));
    
    workoutWithProgress.exercises.forEach((exercise: WorkoutExercise, exerciseIndex: number) => {
      const exerciseKey = `exercise_${exercise.exerciseId}_${exerciseIndex}`;
      const savedExerciseProgress = savedProgress[exerciseKey];
      
      if (savedExerciseProgress) {
        exercise.completed = savedExerciseProgress.completed;
        
        exercise.sets.forEach((set: ExerciseSet) => {
          const savedSet = savedExerciseProgress.sets.find((s: any) => s.setNumber === set.setNumber);
          if (savedSet) {
            set.completed = savedSet.completed;
            set.actualReps = savedSet.actualReps;
            set.actualWeight = savedSet.actualWeight;
            set.actualRir = savedSet.actualRir;
            set.actualRpe = savedSet.actualRpe;
            set.actualNotes = savedSet.actualNotes;
          }
        });
      }
    });
    
    return workoutWithProgress;
  }, []);

  // =========================================================================
  // FUNCIONES DE INTERACCIÓN
  // =========================================================================
  const handleExerciseSelected = useCallback((exercise: Exercise) => {
    if (!workout) return;

    const newExercise: WorkoutExercise = {
      id: Date.now(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseMuscle: exercise.muscle,
      order: workout.exercises.length + 1,
      numberOfSets: 3,
      restBetweenSets: 90,
      notes: '',
      completed: false,
      isNewExercise: true,
      sets: [
        {
          setNumber: 1,
          targetRepsMin: 8,
          targetRepsMax: 12,
          targetWeight: 20,
          rir: 2,
          completed: false,
          actualWeight: 20,
          isNewSet: true
        },
        {
          setNumber: 2,
          targetRepsMin: 8,
          targetRepsMax: 12,
          targetWeight: 22.5,
          rir: 1,
          completed: false,
          actualWeight: 22.5,
          isNewSet: true
        },
        {
          setNumber: 3,
          targetRepsMin: 8,
          targetRepsMax: 12,
          targetWeight: 25,
          rir: 0,
          completed: false,
          actualWeight: 25,
          isNewSet: true
        }
      ]
    };

    setWorkout(prev => ({
      ...prev!,
      exercises: [...prev!.exercises, newExercise]
    }));

    setShowExerciseModal(false);
    
    Alert.alert(
      'Ejercicio añadido',
      `${exercise.name} se ha añadido al entrenamiento`,
      [
        { text: 'Continuar', style: 'default' },
        { 
          text: 'Ir al ejercicio', 
          onPress: () => {
            setSelectedExerciseIndex(workout.exercises.length);
            setViewMode('exercise');
          }
        }
      ]
    );
  }, [workout]);

  const removeExercise = useCallback((exerciseIndex: number) => {
    if (!workout) return;

    const exercise = workout.exercises[exerciseIndex];
    const hasCompletedSets = exercise.sets.some(set => set.completed);

    const proceedWithRemoval = () => {
      const newExercises = workout.exercises.filter((_, index) => index !== exerciseIndex);
      
      const reorderedExercises = newExercises.map((ex, index) => ({
        ...ex,
        order: index + 1
      }));

      setWorkout(prev => ({
        ...prev!,
        exercises: reorderedExercises
      }));

      if (viewMode === 'exercise' && selectedExerciseIndex === exerciseIndex) {
        if (reorderedExercises.length > 0) {
          setSelectedExerciseIndex(0);
        } else {
          setViewMode('overview');
        }
      } else if (viewMode === 'exercise' && selectedExerciseIndex > exerciseIndex) {
        setSelectedExerciseIndex(selectedExerciseIndex - 1);
      }

      const message = reorderedExercises.length === 0 
        ? 'Se ha eliminado el último ejercicio del entrenamiento'
        : `${exercise.exerciseName} eliminado del entrenamiento`;
      
      Alert.alert('Ejercicio eliminado', message);
    };

    if (hasCompletedSets) {
      Alert.alert(
        'Eliminar ejercicio',
        `¿Estás seguro de que quieres eliminar "${exercise.exerciseName}"?\n\nHas completado ${exercise.sets.filter(s => s.completed).length} de ${exercise.sets.length} series. Este progreso se perderá.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: proceedWithRemoval }
        ]
      );
    } else {
      Alert.alert(
        'Eliminar ejercicio',
        `¿Eliminar "${exercise.exerciseName}" del entrenamiento?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: proceedWithRemoval }
        ]
      );
    }
  }, [workout, viewMode, selectedExerciseIndex]);

  const selectExercise = useCallback((exerciseIndex: number) => {
    setSelectedExerciseIndex(exerciseIndex);
    setViewMode('exercise');
  }, []);

  const getExcludedExerciseIds = useCallback((): number[] => {
    return workout?.exercises.map(ex => ex.exerciseId) || [];
  }, [workout]);

  const workoutProgress = useCallback(() => {
    if (!workout) return { completed: 0, total: 0, percentage: 0 };
    
    const totalSets = workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
    const completedSets = workout.exercises.reduce((total, exercise) => 
      total + exercise.sets.filter(set => set.completed).length, 0);
    
    return {
      completed: completedSets,
      total: totalSets,
      percentage: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
    };
  }, [workout]);

  const getExerciseProgress = useCallback((exercise: WorkoutExercise) => {
    const completed = exercise.sets.filter(set => set.completed).length;
    const total = exercise.sets.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  }, []);

  // =========================================================================
  // FUNCIONES DE GUARDADO
  // =========================================================================
  const buildCompleteWorkoutRequest = useCallback((): CompleteWorkoutRequest => {
    if (!workout) throw new Error('No hay workout para guardar');

    // 🔥 DEBUG: Verificar estado de las notas en tiempo real
    console.log('🔥 DEBUG buildRequest - workoutNotes estado actual:', JSON.stringify(workoutNotes));
    console.log('🔥 DEBUG buildRequest - workoutNotes length:', workoutNotes.length);
    console.log('🔥 DEBUG buildRequest - workoutNotes tipo:', typeof workoutNotes);

    const completedAt = new Date();
    
    const exercises: CompletedExercise[] = workout.exercises.map(exercise => ({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      exerciseMuscle: exercise.exerciseMuscle,
      exerciseOrder: exercise.order,
      restBetweenSets: exercise.restBetweenSets,
      notes: exercise.notes,
      wasAddedDuringWorkout: exercise.isNewExercise || false,
      sets: exercise.sets.map(set => ({
        setNumber: set.setNumber,
        targetRepsMin: set.targetRepsMin,
        targetRepsMax: set.targetRepsMax,
        targetWeight: set.targetWeight,
        targetRir: set.rir,
        targetRpe: set.rpe,
        targetNotes: set.notes,
        actualReps: set.actualReps,
        actualWeight: set.actualWeight,
        actualRir: set.actualRir,
        actualRpe: set.actualRpe,
        actualNotes: set.actualNotes,
        completed: set.completed,
        wasAddedDuringWorkout: set.isNewSet || false
      }))
    }));

    // 🔥 FIX: Asegurar que las notas se envíen correctamente
    const trimmedNotes = workoutNotes?.trim();
    const finalNotes = (trimmedNotes && trimmedNotes.length > 0) ? trimmedNotes : undefined;

    // 🔥 DEBUG: Verificar procesamiento de notas
    console.log('🔥 DEBUG buildRequest - trimmedNotes:', JSON.stringify(trimmedNotes));
    console.log('🔥 DEBUG buildRequest - finalNotes:', JSON.stringify(finalNotes));

    const request = {
      routineId: routineId ? parseInt(routineId) : undefined,
      routineName: workout.name,
      routineDescription: workout.description,
      startedAt: workoutStartTime.toISOString(),
      completedAt: completedAt.toISOString(),
      notes: finalNotes,
      // 🔥 NUEVO: Agregar campos del macrociclo
      macrocycleId: macrocycleId ? parseInt(macrocycleId) : undefined,
      absoluteDay: absoluteDay ? parseInt(absoluteDay) : undefined,
      exercises: exercises
    };

    // 🔥 DEBUG: Verificar request final
    console.log('🔥 DEBUG buildRequest - Request final con notas:', JSON.stringify(request.notes));
    console.log('🔥 DEBUG buildRequest - Request final macrocycleId:', request.macrocycleId);
    console.log('🔥 DEBUG buildRequest - Request final absoluteDay:', request.absoluteDay);

    return request;
  }, [workout, routineId, workoutStartTime, workoutNotes, macrocycleId, absoluteDay]);

  const saveWorkoutToBackend = useCallback(async (): Promise<boolean> => {
    if (!token) return false;

    try {
      setSaving(true);
      const workoutData = buildCompleteWorkoutRequest();

      const response = await fetch(`${API_URL}/workout-history/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(workoutData)
      });

      if (response.status === 401) {
        await AsyncStorage.multiRemove(["token", "onboardingComplete"]);
        Alert.alert("Sesión Expirada", "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", [
          { text: "OK", onPress: () => router.replace("/") }
        ]);
        return false;
      }

      if (response.ok) {
        return true;
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'No se pudo guardar el entrenamiento');
        return false;
      }

    } catch (error) {
      console.error('Error al guardar entrenamiento:', error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor');
      return false;
    } finally {
      setSaving(false);
    }
  }, [token, buildCompleteWorkoutRequest, router]);

  const finishWorkout = useCallback(async () => {
    if (!workout) return;

    // 🔥 DEBUG: Verificar estado de notas cuando se presiona finalizar
    console.log('🔥 DEBUG finishWorkout - workoutNotes al presionar finalizar:', JSON.stringify(workoutNotes));
    console.log('🔥 DEBUG finishWorkout - workoutNotes length:', workoutNotes.length);

    const progress = workoutProgress();
    const workoutDuration = Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000);

    if (progress.completed === 0) {
      Alert.alert(
        'Entrenamiento sin completar',
        'No has completado ninguna serie. ¿Quieres guardar el entrenamiento de todas formas?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Guardar de todas formas', 
            onPress: () => proceedWithFinish(progress, workoutDuration) 
          }
        ]
      );
      return;
    }

    if (progress.percentage < 50) {
      Alert.alert(
        'Entrenamiento incompleto',
        `Solo has completado ${progress.completed} de ${progress.total} series (${progress.percentage}%). ¿Quieres finalizar de todas formas?`,
        [
          { text: 'Continuar entrenando', style: 'cancel' },
          { 
            text: 'Finalizar y guardar', 
            onPress: () => proceedWithFinish(progress, workoutDuration) 
          }
        ]
      );
      return;
    }

    await proceedWithFinish(progress, workoutDuration);
  }, [workout, workoutProgress, workoutStartTime, workoutNotes]);

  const proceedWithFinish = useCallback(async (progress: any, workoutDuration: number) => {
    // 🔥 DEBUG: Verificar estado de notas en proceedWithFinish
    console.log('🔥 DEBUG proceedWithFinish - workoutNotes antes de guardar:', JSON.stringify(workoutNotes));

    try {
      const saveSuccess = await saveWorkoutToBackend();
      
      if (saveSuccess) {
        Alert.alert(
          '¡Entrenamiento Completado!',
          `Duración: ${workoutDuration} minutos\nSeries completadas: ${progress.completed}/${progress.total} (${progress.percentage}%)\n\n¡Entrenamiento guardado en tu historial!`,
          [
            {
              text: 'Ver Historial',
              onPress: () => {
                setShowFinishModal(false);
                router.replace('/(tabs)/profile/workout-history');
              }
            },
            {
              text: 'Finalizar',
              style: 'default',
              onPress: () => {
                setShowFinishModal(false);
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Error al guardar',
          'No se pudo guardar el entrenamiento en el servidor. ¿Qué quieres hacer?',
          [
            { 
              text: 'Reintentar', 
              onPress: () => proceedWithFinish(progress, workoutDuration) 
            },
            { 
              text: 'Salir sin guardar', 
              style: 'destructive',
              onPress: () => {
                setShowFinishModal(false);
                router.back();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error crítico al finalizar:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado al guardar el entrenamiento');
    }
  }, [saveWorkoutToBackend, router, workoutNotes]);

  const handleBackPress = useCallback(() => {
    if (viewMode === 'exercise') {
      setViewMode('overview');
      return;
    }
    
    const progress = workoutProgress();
    
    if (progress.completed > 0) {
      Alert.alert(
        'Salir del entrenamiento',
        `Has completado ${progress.completed} de ${progress.total} series. ¿Qué quieres hacer?`,
        [
          { text: 'Continuar entrenando', style: 'cancel' },
          { 
            text: 'Guardar y salir', 
            onPress: async () => {
              const saveSuccess = await saveWorkoutToBackend();
              if (saveSuccess) {
                Alert.alert('Guardado', 'Entrenamiento guardado exitosamente', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                Alert.alert(
                  'Error al guardar',
                  '¿Quieres salir sin guardar?',
                  [
                    { text: 'Reintentar guardar', style: 'cancel' },
                    { text: 'Salir sin guardar', style: 'destructive', onPress: () => router.back() }
                  ]
                );
              }
            }
          },
          { text: 'Salir sin guardar', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  }, [viewMode, workoutProgress, saveWorkoutToBackend, router]);

  const progress = workoutProgress();

  // =========================================================================
  // RENDERIZADO PRINCIPAL
  // =========================================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E4B8B" />
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Error al cargar</Text>
          <Text style={styles.errorSubtitle}>No se pudo cargar la rutina</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (viewMode === 'exercise') {
    return (
      <ExerciseDetailScreen
        workout={workout}
        setWorkout={setWorkout}
        selectedExerciseIndex={selectedExerciseIndex}
        setSelectedExerciseIndex={setSelectedExerciseIndex}
        workoutStartTime={workoutStartTime}
        onBackPress={() => setViewMode('overview')}
        onExerciseCompleted={() => {
          const allExercisesCompleted = workout.exercises.every(ex => ex.completed);
          if (allExercisesCompleted) {
            setShowFinishModal(true);
          }
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.workoutTitle}>
            {workout.name}
            {isCustomizedWorkout && (
              <Text style={styles.customizedIndicator}> ⚡</Text>
            )}
          </Text>
          <Text style={styles.progressText}>
            {progress.completed}/{progress.total} series ({progress.percentage}%)
          </Text>
        </View>
        <View style={styles.timerDisplay}>
          <Ionicons name="time" size={16} color="#5E4B8B" />
          <Text style={styles.timerText}>
            {Math.floor((new Date().getTime() - workoutStartTime.getTime()) / 60000)}min
          </Text>
        </View>
      </View>

      {/* Barra de progreso */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[styles.progressFill, { width: `${progress.percentage}%` }]} 
          />
        </View>
        <View style={styles.progressActions}>
          <TouchableOpacity
            style={styles.progressAction}
            onPress={() => setShowExerciseModal(true)}
          >
            <Ionicons name="add" size={16} color="#5E4B8B" />
            <Text style={styles.progressActionText}>Añadir Ejercicio</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.progressAction}
            onPress={finishWorkout}
          >
            <Ionicons name="checkmark-circle" size={16} color="#5E4B8B" />
            <Text style={[styles.progressActionText, { color: '#5E4B8B' }]}>Finalizar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Vista general de ejercicios */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ejercicios del entrenamiento</Text>
        </View>
        
        {workout.exercises.map((exercise, index) => {
          const exerciseProgress = getExerciseProgress(exercise);
          return (
            <TouchableOpacity
              key={`${exercise.id}-${exercise.exerciseId}`}
              style={[
                styles.exerciseOverviewCard,
                exercise.completed && styles.completedExerciseCard,
                exercise.isNewExercise && styles.newExerciseCard,
                isCustomizedWorkout && styles.customizedExerciseCard
              ]}
              onPress={() => selectExercise(index)}
              activeOpacity={0.7}
            >
              <TouchableOpacity
                style={styles.removeExerciseButton}
                onPress={(e) => {
                  e.stopPropagation();
                  removeExercise(index);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>

              <View style={styles.exerciseCardHeader}>
                <View style={styles.exerciseCardInfo}>
                  <View style={styles.exerciseNameRow}>
                    <Text style={styles.exerciseCardName} numberOfLines={2}>
                      {exercise.exerciseName}
                    </Text>
                    {exercise.isNewExercise && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NUEVO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.exerciseCardMuscle} numberOfLines={1}>
                    {exercise.exerciseMuscle}
                  </Text>
                  <Text style={styles.exerciseCardProgress}>
                    {exerciseProgress.completed}/{exerciseProgress.total} series
                  </Text>
                </View>
              </View>
              
              <View style={styles.exerciseProgressBar}>
                <View 
                  style={[
                    styles.exerciseProgressFill, 
                    { width: `${exerciseProgress.percentage}%` },
                    exercise.completed && styles.completedProgressFill,
                    isCustomizedWorkout && styles.customizedProgressFill
                  ]} 
                />
              </View>

              <View style={styles.setsPreview}>
                {exercise.sets.map((set, setIndex) => (
                  <View 
                    key={`${exercise.id}-set-${setIndex}`}
                    style={[
                      styles.setPreviewDot,
                      set.completed && styles.completedSetDot,
                      set.isNewSet && styles.newSetDot,
                      isCustomizedWorkout && !set.completed && styles.customizedSetDot
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
        
        {/* Sección de notas desplegable */}
        <View style={styles.notesSection}>
          <TouchableOpacity 
            style={styles.notesSectionHeader}
            onPress={() => setNotesExpanded(!notesExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.notesHeaderLeft}>
              <Ionicons name="document-text" size={20} color="#5E4B8B" />
              <Text style={styles.notesSectionTitle}>Notas del entrenamiento</Text>
              {workoutNotes.trim() && (
                <View style={styles.notesIndicator}>
                  <Text style={styles.notesIndicatorText}>✓</Text>
                </View>
              )}
              {/* 🔥 DEBUG: Mostrar longitud de las notas */}
              {workoutNotes && (
                <Text style={{ fontSize: 10, color: '#666', marginLeft: 8 }}>
                  ({workoutNotes.length})
                </Text>
              )}
            </View>
            <Ionicons 
              name={notesExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#9CA3AF" 
            />
          </TouchableOpacity>
          
          {notesExpanded && (
            <View style={styles.notesInputContainer}>
              <TextInput
                style={styles.notesInput}
                placeholder="Escribe tus notas sobre este entrenamiento..."
                placeholderTextColor="#9CA3AF"
                value={workoutNotes}
                onChangeText={(text) => {
                  console.log('✏️ Escribiendo nota:', text); // Debug temporal
                  setWorkoutNotes(text);
                }}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                autoCapitalize="sentences"
                autoCorrect={true}
                blurOnSubmit={false}
                returnKeyType="default"
                editable={true}
                scrollEnabled={true}
                maxLength={500}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal reutilizable para ejercicios */}
      <ExercisePickerModal
        visible={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onExerciseSelected={handleExerciseSelected}
        excludedExerciseIds={getExcludedExerciseIds()}
        showCreateOption={true}
        title="Añadir Ejercicio"
        subtitle="Busca un ejercicio o crea uno nuevo para tu entrenamiento"
      />

      {/* Modal de finalizar entrenamiento */}
      <Modal
        visible={showFinishModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFinishModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Finalizar Entrenamiento</Text>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                ¿Estás seguro de que quieres finalizar el entrenamiento?
              </Text>
              <Text style={styles.modalSubtext}>
                Progreso: {progress.completed}/{progress.total} series ({progress.percentage}%)
              </Text>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowFinishModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Continuar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.finishButton]}
                  onPress={finishWorkout}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.finishButtonText}>Finalizar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// =========================================================================
// ESTILOS
// =========================================================================

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

  // Header y progreso
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  customizedIndicator: {
    fontSize: 16,
    color: '#5E4B8B',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E4B8B',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5E4B8B',
    borderRadius: 4,
  },
  progressActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    gap: 4,
  },
  progressActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E4B8B',
  },

  // Contenido general
  content: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Tarjetas de ejercicios
  exerciseOverviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#5E4B8B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
  },
  completedExerciseCard: {
    borderLeftColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  newExerciseCard: {
    borderLeftColor: '#F59E0B',
  },
  customizedExerciseCard: {
    borderLeftColor: '#5E4B8B',
    backgroundColor: '#FAFBFE',
  },
  removeExerciseButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#5E4B8B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseCardInfo: {
    flex: 1,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  exerciseCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  newBadge: {
    backgroundColor: '#8B7AB8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  exerciseCardMuscle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  exerciseCardProgress: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  exerciseProgressBar: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  exerciseProgressFill: {
    height: '100%',
    backgroundColor: '#5E4B8B',
    borderRadius: 2,
  },
  completedProgressFill: {
    backgroundColor: '#10B981',
  },
  customizedProgressFill: {
    backgroundColor: '#8B7AB8',
  },
  setsPreview: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 4,
  },
  setPreviewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  completedSetDot: {
    backgroundColor: '#5E4B8B',
  },
  newSetDot: {
    backgroundColor: '#F59E0B',
  },
  customizedSetDot: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#8B7AB8',
  },

  // Sección de notas desplegable
  notesSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  notesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
  },
  notesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  notesIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  notesIndicatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  notesInputContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFBFC',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: 'white',
    minHeight: 100,
    maxHeight: 150,
    marginTop: 16,
    fontFamily: 'System', // Asegurar fuente del sistema
  },

  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 0,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalContent: {
    padding: 24,
  },
  modalText: {
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  finishButton: {
    backgroundColor: '#10B981',
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default WorkoutScreen;