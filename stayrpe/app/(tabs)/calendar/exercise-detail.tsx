import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { WorkoutData, WorkoutExercise, ExerciseSet } from '../../workout';

interface ExerciseDetailScreenProps {
  workout: WorkoutData;
  setWorkout: React.Dispatch<React.SetStateAction<WorkoutData | null>>;
  selectedExerciseIndex: number;
  setSelectedExerciseIndex: React.Dispatch<React.SetStateAction<number>>;
  workoutStartTime: Date;
  onBackPress: () => void;
  onExerciseCompleted: () => void;
}

const ExerciseDetailScreen: React.FC<ExerciseDetailScreenProps> = ({
  workout,
  setWorkout,
  selectedExerciseIndex,
  setSelectedExerciseIndex,
  workoutStartTime,
  onBackPress,
  onExerciseCompleted,
}) => {
  const [selectedSetIndex, setSelectedSetIndex] = useState(0);
  const [isRestTimer, setIsRestTimer] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);

  const selectedExercise = workout.exercises[selectedExerciseIndex];
  const selectedSet = selectedExercise?.sets[selectedSetIndex];

  const isValidRir = (rir: any): boolean => {
    return rir !== undefined && rir !== null && rir >= 0 && rir <= 5;
  };

  const isValidRpe = (rpe: any): boolean => {
    return rpe !== undefined && rpe !== null && rpe >= 1 && rpe <= 10;
  };

  useEffect(() => {
    if (selectedExercise) {
      const firstIncompleteSet = selectedExercise.sets.findIndex(set => !set.completed);
      setSelectedSetIndex(firstIncompleteSet !== -1 ? firstIncompleteSet : 0);
    }
  }, [selectedExerciseIndex, selectedExercise]);

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

  const addSetToExercise = () => {
    if (!selectedExercise) return;

    let baseSet = {
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetWeight: 20,
      rir: 2,
      rpe: undefined,
      notes: undefined,
    };

    if (selectedExercise.sets.length > 0) {
      const lastSet = selectedExercise.sets[selectedExercise.sets.length - 1];
      baseSet = {
        targetRepsMin: lastSet.targetRepsMin,
        targetRepsMax: lastSet.targetRepsMax,
        targetWeight: lastSet.targetWeight,
        rir: lastSet.rir,
        rpe: lastSet.rpe,
        notes: lastSet.notes,
      };
    }

    const newSet: ExerciseSet = {
      id: Date.now(),
      setNumber: selectedExercise.sets.length + 1,
      targetRepsMin: baseSet.targetRepsMin,
      targetRepsMax: baseSet.targetRepsMax,
      targetWeight: baseSet.targetWeight,
      rir: baseSet.rir,
      rpe: baseSet.rpe,
      notes: baseSet.notes,
      actualReps: undefined,
      actualWeight: baseSet.targetWeight,
      actualRir: undefined,
      actualRpe: undefined,
      actualNotes: undefined,
      completed: false,
      isNewSet: true
    };

    const newWorkout = JSON.parse(JSON.stringify(workout));
    newWorkout.exercises[selectedExerciseIndex].sets.push(newSet);
    newWorkout.exercises[selectedExerciseIndex].numberOfSets = newWorkout.exercises[selectedExerciseIndex].sets.length;

    setWorkout(newWorkout);
    setSelectedSetIndex(newSet.setNumber - 1);
  };

  const removeSetFromExercise = (setIndex: number) => {
    if (!selectedExercise || selectedExercise.sets.length <= 1) {
      Alert.alert('Error', 'Un ejercicio debe tener al menos una serie');
      return;
    }

    const setToRemove = selectedExercise.sets[setIndex];
    
    if (setToRemove.completed) {
      Alert.alert(
        'Eliminar Serie',
        `¿Eliminar la serie ${setToRemove.setNumber} completada?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => performRemoveSet(setIndex) }
        ]
      );
    } else {
      performRemoveSet(setIndex);
    }
  };

  const performRemoveSet = (setIndex: number) => {
    const newWorkout = JSON.parse(JSON.stringify(workout));
    
    newWorkout.exercises[selectedExerciseIndex].sets.splice(setIndex, 1);
    
    newWorkout.exercises[selectedExerciseIndex].sets.forEach((set: ExerciseSet, index: number) => {
      set.setNumber = index + 1;
    });
    
    newWorkout.exercises[selectedExerciseIndex].numberOfSets = newWorkout.exercises[selectedExerciseIndex].sets.length;

    setWorkout(newWorkout);

    if (selectedSetIndex >= newWorkout.exercises[selectedExerciseIndex].sets.length) {
      setSelectedSetIndex(Math.max(0, newWorkout.exercises[selectedExerciseIndex].sets.length - 1));
    }
  };

  const updateSet = (setIndex: number, field: keyof ExerciseSet, value: any) => {
    setWorkout(prev => {
      if (!prev) return prev;
      
      const newWorkout = JSON.parse(JSON.stringify(prev));
      const exercise = newWorkout.exercises[selectedExerciseIndex];
      const set = exercise.sets[setIndex];
      
      (set as any)[field] = value;
      
      return newWorkout;
    });
  };

  const completeSet = (setIndex: number) => {
    const exercise = selectedExercise;
    const set = exercise.sets[setIndex];

    if (!set.actualReps || set.actualReps <= 0) {
      Alert.alert('Error', 'Ingresa el número de repeticiones realizadas');
      return;
    }

    if (!set.actualWeight || set.actualWeight <= 0) {
      Alert.alert('Error', 'Ingresa el peso utilizado');
      return;
    }

    updateSet(setIndex, 'completed', true);

    const isLastSet = setIndex === exercise.sets.length - 1;
    
    if (isLastSet) {
      const allSetsCompleted = exercise.sets.every(s => s.completed);
      if (allSetsCompleted) {
        const newWorkout = JSON.parse(JSON.stringify(workout));
        newWorkout.exercises[selectedExerciseIndex].completed = true;
        setWorkout(newWorkout);
        
        Alert.alert('¡Ejercicio completado! 🎉', exercise.exerciseName);
        onExerciseCompleted();
      }
    }

    if (!isLastSet) {
      setSelectedSetIndex(setIndex + 1);
      
      const restTime = exercise.restBetweenSets || 90;
      setRestTimeLeft(restTime);
      setIsRestTimer(true);
    } else {
      const nextIncompleteExercise = workout.exercises.findIndex((ex, idx) => 
        idx > selectedExerciseIndex && !ex.completed
      );
      
      if (nextIncompleteExercise !== -1) {
        setSelectedExerciseIndex(nextIncompleteExercise);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const skipRest = () => {
    setIsRestTimer(false);
    setRestTimeLeft(0);
  };

  const renderSetsGrid = () => {
    const sets = selectedExercise.sets;
    const setsPerRow = 5;
    const rows = [];
    
    for (let i = 0; i < sets.length; i += setsPerRow) {
      const rowSets = sets.slice(i, i + setsPerRow);
      rows.push(rowSets);
    }

    return (
      <View style={styles.setsGrid}>
        {rows.map((rowSets, rowIndex) => (
          <View key={rowIndex} style={styles.setsRow}>
            {rowSets.map((set, setIndexInRow) => {
              const globalSetIndex = rowIndex * setsPerRow + setIndexInRow;
              return (
                <View key={globalSetIndex} style={styles.setOptionContainer}>
                  <TouchableOpacity
                    style={[
                      styles.setOption,
                      globalSetIndex === selectedSetIndex && styles.selectedSetOption,
                      set.completed && styles.completedSetOption,
                      set.isNewSet && styles.newSetOption
                    ]}
                    onPress={() => setSelectedSetIndex(globalSetIndex)}
                  >
                    <Text style={[
                      styles.setOptionText,
                      globalSetIndex === selectedSetIndex && styles.selectedSetOptionText,
                      set.completed && styles.completedSetOptionText
                    ]}>
                      {set.completed ? '✓' : globalSetIndex + 1}
                    </Text>
                    {set.isNewSet && (
                      <View style={styles.newSetIndicator} />
                    )}
                  </TouchableOpacity>
                  
                  {selectedExercise.sets.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeSetButton}
                      onPress={() => removeSetFromExercise(globalSetIndex)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={12} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            
            {rowIndex === rows.length - 1 && (
              <TouchableOpacity
                style={styles.addSetInlineButton}
                onPress={addSetToExercise}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={24} color="#5E4B8B" />
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        {sets.length === 0 && (
          <View style={styles.setsRow}>
            <TouchableOpacity
              style={styles.addSetInlineButton}
              onPress={addSetToExercise}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={24} color="#5E4B8B" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (!selectedExercise) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#9CA3AF" />
          <Text style={styles.errorTitle}>Ejercicio no encontrado</Text>
          <TouchableOpacity style={styles.errorButton} onPress={onBackPress}>
            <Text style={styles.errorButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedSet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#9CA3AF" />
          <Text style={styles.errorTitle}>Serie no encontrada</Text>
          <TouchableOpacity style={styles.errorButton} onPress={onBackPress}>
            <Text style={styles.errorButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.workoutTitle}>{selectedExercise.exerciseName}</Text>
          <Text style={styles.progressText}>
            {selectedExercise.sets.filter(s => s.completed).length}/{selectedExercise.sets.length} series
          </Text>
        </View>
        <View style={styles.timerDisplay}>
          <Ionicons name="time" size={16} color="#5E4B8B" />
          <Text style={styles.timerText}>
            {Math.floor((new Date().getTime() - workoutStartTime.getTime()) / 60000)}min
          </Text>
        </View>
      </View>

      {isRestTimer && (
        <View style={styles.restTimerContainer}>
          <View style={styles.restTimerCard}>
            <View style={styles.restTimerHeader}>
              <Ionicons name="time" size={24} color="#5E4B8B" />
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
        <View style={styles.exerciseDetailCard}>
          <View style={styles.exerciseDetailHeader}>
            <View style={styles.exerciseNameRow}>
              <Text style={styles.exerciseDetailName}>{selectedExercise.exerciseName}</Text>
              {selectedExercise.isNewExercise && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NUEVO</Text>
                </View>
              )}
            </View>
            <Text style={styles.exerciseDetailMuscle}>{selectedExercise.exerciseMuscle}</Text>
          </View>
          
          {selectedExercise.notes && (
            <View style={styles.notesContainer}>
              <Ionicons name="information-circle" size={16} color="#6B7280" />
              <Text style={styles.notesText}>{selectedExercise.notes}</Text>
            </View>
          )}

          <View style={styles.setSelector}>
            <View style={styles.setSelectorHeader}>
              <Text style={styles.setSelectorTitle}>
                Series ({selectedExercise.sets.length})
              </Text>
              <TouchableOpacity
                style={styles.addSetMainButton}
                onPress={addSetToExercise}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={20} color="#5E4B8B" />
                <Text style={styles.addSetMainText}>Añadir</Text>
              </TouchableOpacity>
            </View>
            
            {renderSetsGrid()}
          </View>
        </View>

        <View style={styles.currentSetCard}>
          <View style={styles.setHeader}>
            <View style={styles.setTitleRow}>
              <Text style={styles.setTitle}>
                Serie {selectedSet.setNumber}
              </Text>
              {selectedExercise.sets.length > 1 && (
                <TouchableOpacity
                  style={styles.removeCurrentSetButton}
                  onPress={() => removeSetFromExercise(selectedSetIndex)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color="#6B7280" />
                  <Text style={styles.removeCurrentSetText}>Eliminar</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.targetText}>
              {selectedSet.targetRepsMin}-{selectedSet.targetRepsMax} reps × {selectedSet.targetWeight}kg
              {(() => {
                if (isValidRpe(selectedSet.rpe)) {
                  return ` (@${selectedSet.rpe} RPE)`;
                } else if (isValidRir(selectedSet.rir)) {
                  return ` (${selectedSet.rir} RIR)`;
                }
                return '';
              })()}
            </Text>
            
            {selectedSet.notes && selectedSet.notes.trim() && (
              <View style={styles.targetNotesContainer}>
                <Ionicons name="document-text-outline" size={14} color="#5E4B8B" />
                <Text style={styles.targetNotesText}>
                  Notas: {selectedSet.notes}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputsContainer}>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Repeticiones</Text>
                <TextInput
                  style={[styles.input, selectedSet.completed && styles.completedInput]}
                  value={selectedSet.actualReps?.toString() || ''}
                  onChangeText={(text) => updateSet(selectedSetIndex, 'actualReps', parseInt(text) || 0)}
                  keyboardType="number-pad"
                  placeholder={`${selectedSet.targetRepsMin}-${selectedSet.targetRepsMax}`}
                  placeholderTextColor="#9CA3AF"
                  editable={!selectedSet.completed}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Peso (kg)</Text>
                <TextInput
                  style={[styles.input, selectedSet.completed && styles.completedInput]}
                  value={selectedSet.actualWeight?.toString() || ''}
                  onChangeText={(text) => updateSet(selectedSetIndex, 'actualWeight', parseFloat(text) || 0)}
                  keyboardType="numeric"
                  placeholder={selectedSet.targetWeight.toString()}
                  placeholderTextColor="#9CA3AF"
                  editable={!selectedSet.completed}
                />
              </View>
            </View>

            {(isValidRir(selectedSet.rir) || isValidRpe(selectedSet.rpe)) && (
              <View style={styles.intensityRow}>
                <Text style={styles.intensityLabel}>
                  Intensidad percibida:
                </Text>
                
                {isValidRir(selectedSet.rir) && !isValidRpe(selectedSet.rpe) && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>RIR (0-5)</Text>
                    <TextInput
                      style={[styles.input, selectedSet.completed && styles.completedInput]}
                      value={selectedSet.actualRir?.toString() || ''}
                      onChangeText={(text) => {
                        if (text === '' || text === null || text === undefined) {
                          updateSet(selectedSetIndex, 'actualRir', undefined);
                        } else {
                          const value = parseInt(text);
                          if (!isNaN(value)) {
                            const clampedValue = Math.min(Math.max(value, 0), 5);
                            updateSet(selectedSetIndex, 'actualRir', clampedValue);
                          }
                        }
                      }}
                      keyboardType="number-pad"
                      placeholder={selectedSet.rir?.toString() || '2'}
                      placeholderTextColor="#9CA3AF"
                      editable={!selectedSet.completed}
                      selectTextOnFocus={true}
                    />
                  </View>
                )}

                {isValidRpe(selectedSet.rpe) && !isValidRir(selectedSet.rir) && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>RPE (1-10)</Text>
                    <TextInput
                      style={[styles.input, selectedSet.completed && styles.completedInput]}
                      value={selectedSet.actualRpe?.toString() || ''}
                      onChangeText={(text) => {
                        if (text === '' || text === null || text === undefined) {
                          updateSet(selectedSetIndex, 'actualRpe', undefined);
                        } else {
                          const value = parseInt(text);
                          if (!isNaN(value)) {
                            const clampedValue = Math.min(Math.max(value, 1), 10);
                            updateSet(selectedSetIndex, 'actualRpe', clampedValue);
                          }
                        }
                      }}
                      keyboardType="number-pad"
                      placeholder={selectedSet.rpe?.toString() || '8'}
                      placeholderTextColor="#9CA3AF"
                      editable={!selectedSet.completed}
                      selectTextOnFocus={true}
                    />
                  </View>
                )}
              </View>
            )}

            <View style={styles.notesInputContainer}>
              <Text style={styles.inputLabel}>Notas de la serie (opcional)</Text>
              <TextInput
                style={[styles.notesInput, selectedSet.completed && styles.completedInput]}
                value={selectedSet.actualNotes || ''}
                onChangeText={(text) => updateSet(selectedSetIndex, 'actualNotes', text || undefined)}
                placeholder="Ej: Me costó la última rep, usé ayuda..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                editable={!selectedSet.completed}
                autoCapitalize="sentences"
                autoCorrect={true}
                maxLength={200}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.completeSetButton,
                selectedSet.completed && styles.completedSetButton
              ]}
              onPress={() => completeSet(selectedSetIndex)}
              disabled={selectedSet.completed}
            >
              <View style={styles.completeButtonContent}>
                {selectedSet.completed ? (
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    marginBottom: 70
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#5E4B8B',
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
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
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
    fontWeight: '500',
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E4B8B',
  },
  restTimerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  restTimerCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 10,
    minWidth: 280,
  },
  restTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  restTimerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  restTimerDisplay: {
    fontSize: 56,
    fontWeight: '700',
    color: '#5E4B8B',
    marginBottom: 24,
  },
  skipRestButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skipRestText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  exerciseDetailCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  exerciseDetailHeader: {
    marginBottom: 16,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  exerciseDetailName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  newBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  exerciseDetailMuscle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  setSelector: {
    marginTop: 8,
  },
  setSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  setSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  addSetMainButton: {
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addSetMainText: {
    color: '#5E4B8B',
    fontSize: 14,
    fontWeight: '600',
  },
  setsGrid: {
    marginBottom: 8,
  },
  setsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  setOptionContainer: {
    position: 'relative',
    marginRight: 12,
    alignItems: 'center',
  },
  setOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  selectedSetOption: {
    backgroundColor: '#5E4B8B',
    borderColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  completedSetOption: {
    backgroundColor: '#5E4B8B',
  },
  newSetOption: {
    borderColor: '#5E4B8B',
  },
  setOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  selectedSetOptionText: {
    color: 'white',
  },
  completedSetOptionText: {
    color: 'white',
  },
  newSetIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  removeSetButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addSetInlineButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginLeft: 8,
  },
  currentSetCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  setHeader: {
    marginBottom: 20,
  },
  setTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  setTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  removeCurrentSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  removeCurrentSetText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  targetText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 22,
  },
  targetNotesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F4FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#5E4B8B',
  },
  targetNotesText: {
    flex: 1,
    fontSize: 13,
    color: '#5E4B8B',
    fontWeight: '500',
    lineHeight: 18,
  },
  inputsContainer: {
    gap: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  intensityRow: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#5E4B8B',
  },
  intensityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E4B8B',
    marginBottom: 12,
  },
  notesInputContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#D1D5DB',
  },
  notesInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 60,
    textAlignVertical: 'top',
    fontWeight: '400',
    fontFamily: 'System',
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
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
  },
  completedInput: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    color: '#374151',
  },
  completeSetButton: {
    backgroundColor: '#5E4B8B',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  completedSetButton: {
    backgroundColor: '#5E4B8B',
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
});

export default ExerciseDetailScreen;