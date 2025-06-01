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
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface ExerciseSet {
  id?: number;
  setNumber: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeight: number;
  rir?: number;
  rpe?: number;
  notes?: string;
  // Estados para el workout
  actualReps?: number;
  actualWeight?: number;
  actualRir?: number;
  completed: boolean;
}

interface WorkoutExercise {
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
}

interface WorkoutData {
  id: number;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
}

const WorkoutScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isRestTimer, setIsRestTimer] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [workoutStartTime] = useState(new Date());

  const API_URL = 'http://192.168.0.57:8080';
  const routineId = params.routineId as string;
  const routineName = params.routineName as string;

  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      setToken(storedToken);
    };
    getToken();
  }, []);

  useEffect(() => {
    if (token && routineId) {
      loadRoutineData();
    }
  }, [token, routineId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRestTimer && restTimeLeft > 0) {
      interval = setInterval(() => {
        setRestTimeLeft(time => {
          if (time <= 1) {
            setIsRestTimer(false);
            Alert.alert('¡Descanso terminado!', 'Es hora de la siguiente serie');
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRestTimer, restTimeLeft]);

  const loadRoutineData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/routines/${routineId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
        const workoutData: WorkoutData = {
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
              actualRir: undefined
            }))
          }))
        };
        setWorkout(workoutData);
      } else {
        Alert.alert('Error', 'No se pudo cargar la rutina');
        router.back();
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: any) => {
    if (!workout) return;

    const newWorkout = { ...workout };
    const exercise = newWorkout.exercises[exerciseIndex];
    const set = exercise.sets[setIndex];
    
    (set as any)[field] = value;
    
    setWorkout(newWorkout);
  };

  const completeSet = (exerciseIndex: number, setIndex: number) => {
    if (!workout) return;

    const exercise = workout.exercises[exerciseIndex];
    const set = exercise.sets[setIndex];

    // Validar que tiene datos mínimos
    if (!set.actualReps || set.actualReps <= 0) {
      Alert.alert('Error', 'Ingresa el número de repeticiones realizadas');
      return;
    }

    if (!set.actualWeight || set.actualWeight <= 0) {
      Alert.alert('Error', 'Ingresa el peso utilizado');
      return;
    }

    // Marcar como completada
    updateSet(exerciseIndex, setIndex, 'completed', true);

    // Verificar si es la última serie del ejercicio
    const isLastSet = setIndex === exercise.sets.length - 1;
    
    if (isLastSet) {
      // Marcar ejercicio como completado
      const newWorkout = { ...workout };
      newWorkout.exercises[exerciseIndex].completed = true;
      setWorkout(newWorkout);

      // Verificar si es el último ejercicio
      const isLastExercise = exerciseIndex === workout.exercises.length - 1;
      
      if (isLastExercise) {
        setShowFinishModal(true);
        return;
      } else {
        // Mover al siguiente ejercicio
        setCurrentExerciseIndex(exerciseIndex + 1);
        setCurrentSetIndex(0);
        Alert.alert('¡Ejercicio completado!', `Pasando a: ${workout.exercises[exerciseIndex + 1].exerciseName}`);
        return;
      }
    }

    // Iniciar descanso si no es la última serie
    const restTime = exercise.restBetweenSets || 90;
    setRestTimeLeft(restTime);
    setIsRestTimer(true);
    
    // Mover a la siguiente serie
    setCurrentSetIndex(setIndex + 1);
  };

  const skipRest = () => {
    setIsRestTimer(false);
    setRestTimeLeft(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWorkoutProgress = () => {
    if (!workout) return { completed: 0, total: 0, percentage: 0 };
    
    const totalSets = workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
    const completedSets = workout.exercises.reduce((total, exercise) => 
      total + exercise.sets.filter(set => set.completed).length, 0);
    
    return {
      completed: completedSets,
      total: totalSets,
      percentage: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
    };
  };

  const finishWorkout = async () => {
    if (!workout || !token) return;

    try {
      setSaving(true);
      
      // Aquí podrías enviar los datos del workout completado al backend
      // Por ahora, solo mostraremos un mensaje de éxito
      
      const workoutDuration = Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000); // en minutos
      const progress = getWorkoutProgress();
      
      Alert.alert(
        '¡Entrenamiento Completado! 🎉',
        `Duración: ${workoutDuration} minutos\nSeries completadas: ${progress.completed}/${progress.total}`,
        [
          {
            text: 'Finalizar',
            onPress: () => {
              setShowFinishModal(false);
              router.back(); // Volver al calendario
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error guardando workout:', error);
      Alert.alert('Error', 'No se pudo guardar el entrenamiento');
    } finally {
      setSaving(false);
    }
  };

  const handleBackPress = () => {
    const progress = getWorkoutProgress();
    
    if (progress.completed > 0) {
      Alert.alert(
        'Salir del entrenamiento',
        '¿Estás seguro de que quieres salir? Se perderá el progreso actual.',
        [
          { text: 'Continuar entrenando', style: 'cancel' },
          { text: 'Salir', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E4B8B" />
          <Text style={styles.loadingText}>Cargando entrenamiento...</Text>
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

  const currentExercise = workout.exercises[currentExerciseIndex];
  const currentSet = currentExercise?.sets[currentSetIndex];
  const progress = getWorkoutProgress();
  const hasIntensity = currentSet?.rir !== undefined || currentSet?.rpe !== undefined;
  const intensityType = currentSet?.rir !== undefined ? 'RIR' : 'RPE';
  const intensityValue = currentSet?.rir !== undefined ? currentSet.rir : currentSet?.rpe;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.workoutTitle}>{workout.name}</Text>
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
      </View>

      {/* Temporizador de descanso */}
      {isRestTimer && (
        <View style={styles.restTimerContainer}>
          <View style={styles.restTimerCard}>
            <View style={styles.restTimerHeader}>
              <Ionicons name="time" size={24} color="#10B981" />
              <Text style={styles.restTimerTitle}>Tiempo de descanso</Text>
            </View>
            <Text style={styles.restTimerDisplay}>{formatTime(restTimeLeft)}</Text>
            <TouchableOpacity style={styles.skipRestButton} onPress={skipRest}>
              <Text style={styles.skipRestText}>Saltar descanso</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Ejercicio actual */}
        <View style={styles.currentExerciseCard}>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseNumberContainer}>
              <Text style={styles.exerciseNumber}>{currentExerciseIndex + 1}</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{currentExercise.exerciseName}</Text>
              <Text style={styles.exerciseMuscle}>{currentExercise.exerciseMuscle}</Text>
            </View>
            <View style={styles.setsCounter}>
              <Text style={styles.setsCounterText}>
                {currentSetIndex + 1}/{currentExercise.sets.length}
              </Text>
            </View>
          </View>

          {currentExercise.notes && (
            <View style={styles.notesContainer}>
              <Ionicons name="information-circle" size={16} color="#6B7280" />
              <Text style={styles.notesText}>{currentExercise.notes}</Text>
            </View>
          )}
        </View>

        {/* Serie actual */}
        <View style={styles.currentSetCard}>
          <View style={styles.setHeader}>
            <Text style={styles.setTitle}>Serie {currentSet.setNumber}</Text>
            <View style={styles.targetInfo}>
              <Text style={styles.targetText}>
                {currentSet.targetRepsMin}-{currentSet.targetRepsMax} reps × {currentSet.targetWeight}kg
              </Text>
              {hasIntensity && (
                <Text style={styles.intensityText}>
                  {intensityType}: {intensityValue}
                </Text>
              )}
            </View>
          </View>

          {/* Inputs para datos reales */}
          <View style={styles.inputsContainer}>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Repeticiones</Text>
                <TextInput
                  style={styles.input}
                  value={currentSet.actualReps?.toString() || ''}
                  onChangeText={(text) => updateSet(currentExerciseIndex, currentSetIndex, 'actualReps', parseInt(text) || 0)}
                  keyboardType="number-pad"
                  placeholder={`${currentSet.targetRepsMin}-${currentSet.targetRepsMax}`}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Peso (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={currentSet.actualWeight?.toString() || ''}
                  onChangeText={(text) => updateSet(currentExerciseIndex, currentSetIndex, 'actualWeight', parseFloat(text) || 0)}
                  keyboardType="numeric"
                  placeholder={currentSet.targetWeight.toString()}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {hasIntensity && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{intensityType}</Text>
                  <TextInput
                    style={styles.input}
                    value={currentSet.actualRir?.toString() || ''}
                    onChangeText={(text) => updateSet(currentExerciseIndex, currentSetIndex, 'actualRir', parseInt(text) || 0)}
                    keyboardType="number-pad"
                    placeholder={intensityValue?.toString()}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              )}
            </View>

            {/* Botón de completar serie */}
            <TouchableOpacity
              style={[
                styles.completeSetButton,
                currentSet.completed && styles.completedSetButton
              ]}
              onPress={() => completeSet(currentExerciseIndex, currentSetIndex)}
              disabled={currentSet.completed}
            >
              <View style={styles.completeButtonContent}>
                {currentSet.completed ? (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="white" />
                    <Text style={styles.completeButtonText}>Serie Completada</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={24} color="white" />
                    <Text style={styles.completeButtonText}>Completar Serie</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Resumen de ejercicios */}
        <View style={styles.exercisesSummary}>
          <Text style={styles.summaryTitle}>Ejercicios del entrenamiento</Text>
          {workout.exercises.map((exercise, index) => (
            <View key={exercise.id} style={[
              styles.exerciseSummaryItem,
              index === currentExerciseIndex && styles.currentExerciseSummary,
              exercise.completed && styles.completedExerciseSummary
            ]}>
              <View style={styles.summaryHeader}>
                <View style={[
                  styles.summaryNumber,
                  index === currentExerciseIndex && styles.currentSummaryNumber,
                  exercise.completed && styles.completedSummaryNumber
                ]}>
                  {exercise.completed ? (
                    <Ionicons name="checkmark" size={14} color="white" />
                  ) : (
                    <Text style={styles.summaryNumberText}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.summaryInfo}>
                  <Text style={[
                    styles.summaryName,
                    index === currentExerciseIndex && styles.currentSummaryName
                  ]}>
                    {exercise.exerciseName}
                  </Text>
                  <Text style={styles.summaryMeta}>
                    {exercise.sets.filter(set => set.completed).length}/{exercise.sets.length} series
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Modal de finalizar entrenamiento */}
      <Modal
        visible={showFinishModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFinishModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.finishModal}>
            <View style={styles.finishModalHeader}>
              <View style={styles.celebrationIcon}>
                <Ionicons name="trophy" size={48} color="#F59E0B" />
              </View>
              <Text style={styles.finishModalTitle}>¡Entrenamiento Completado!</Text>
              <Text style={styles.finishModalSubtitle}>
                Has terminado todos los ejercicios programados
              </Text>
            </View>

            <View style={styles.finishStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{progress.completed}</Text>
                <Text style={styles.statLabel}>Series completadas</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Math.floor((new Date().getTime() - workoutStartTime.getTime()) / 60000)}
                </Text>
                <Text style={styles.statLabel}>Minutos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{workout.exercises.length}</Text>
                <Text style={styles.statLabel}>Ejercicios</Text>
              </View>
            </View>

            <View style={styles.finishActions}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => setShowFinishModal(false)}
              >
                <Text style={styles.continueButtonText}>Continuar entrenando</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.finishButton}
                onPress={finishWorkout}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.finishButtonText}>Finalizar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5E4B8B',
    borderRadius: 4,
  },
  restTimerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  restTimerCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  restTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  restTimerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  restTimerDisplay: {
    fontSize: 48,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 24,
  },
  skipRestButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  skipRestText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentExerciseCard: {
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
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5E4B8B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exerciseNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  exerciseMuscle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  setsCounter: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  setsCounterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  currentSetCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  setHeader: {
    marginBottom: 20,
  },
  setTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  targetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  targetText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  intensityText: {
    fontSize: 14,
    color: '#5E4B8B',
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inputsContainer: {
    gap: 20,
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
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
  },
  completeSetButton: {
    backgroundColor: '#5E4B8B',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  completedSetButton: {
    backgroundColor: '#10B981',
  },
  completeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  exercisesSummary: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 100,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  exerciseSummaryItem: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  currentExerciseSummary: {
    backgroundColor: '#EDE9FE',
    borderWidth: 2,
    borderColor: '#5E4B8B',
  },
  completedExerciseSummary: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currentSummaryNumber: {
    backgroundColor: '#5E4B8B',
  },
  completedSummaryNumber: {
    backgroundColor: '#10B981',
  },
  summaryNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  currentSummaryName: {
    color: '#5E4B8B',
  },
  summaryMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  finishModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  finishModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  celebrationIcon: {
    marginBottom: 16,
  },
  finishModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  finishModalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  finishStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#5E4B8B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  finishActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  finishButton: {
    flex: 1,
    backgroundColor: '#5E4B8B',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default WorkoutScreen;