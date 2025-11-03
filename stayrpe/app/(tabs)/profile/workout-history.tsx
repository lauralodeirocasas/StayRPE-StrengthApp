import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  Platform,
  UIManager,
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WorkoutHistorySet {
  setNumber: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetWeight?: number;
  targetRir?: number;
  targetRpe?: number;
  actualReps?: number;
  actualWeight?: number;
  actualRir?: number;
  actualRpe?: number;
  actualNotes?: string;
  completed: boolean;
  wasAddedDuringWorkout?: boolean;
  volume?: number;
  performanceComparison?: string;
}

interface WorkoutHistoryExercise {
  exerciseName: string;
  exerciseMuscle: string;
  exerciseOrder: number;
  plannedSets: number;
  completedSets: number;
  totalVolume?: number;
  wasAddedDuringWorkout?: boolean;
  sets?: WorkoutHistorySet[];
}

interface WorkoutHistory {
  id: number;
  routineName: string;
  routineDescription?: string;
  startedAt: string;
  completedAt: string;
  durationMinutes: number;
  totalExercises: number;
  totalSets: number;
  completedSets: number;
  completionPercentage: number;
  totalVolume?: number;
  notes?: string;
  macrocycleName?: string;
  absoluteDay?: number;
  exercises?: WorkoutHistoryExercise[];
}

type SortOrder = 'desc' | 'asc';

const WorkoutHistoryScreen = () => {
  const [allWorkouts, setAllWorkouts] = useState<WorkoutHistory[]>([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState<WorkoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutHistory | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadedDetails, setLoadedDetails] = useState<Set<number>>(new Set());
  const [showInfoCard, setShowInfoCard] = useState(true);
  
  const [selectedMacrocycle, setSelectedMacrocycle] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [availableMacrocycles, setAvailableMacrocycles] = useState<string[]>([]);
  
  const router = useRouter();
  const API_URL =  process.env.EXPO_PUBLIC_API_BASE;

  const getInfoCardKey = (username: string) => `workout_history_info_hidden_${username}`;

  const formatRirRpe = (rir?: number, rpe?: number) => {
    let result = '';
    if (rir !== undefined && rir !== null && rir !== '') {
      result += ` -RIR ${rir}`;
    }
    if (rpe !== undefined && rpe !== null && rpe !== '') {
      result += ` -RPE @${rpe}`;
    }
    return result;
  };

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

  useEffect(() => {
    const getCurrentUser = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/user/profile`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setCurrentUsername(userData.username);
        }
      } catch (error) {
        console.error('Error obteniendo usuario actual:', error);
      }
    };

    getCurrentUser();
  }, [token]);

  useEffect(() => {
    const checkInfoCardVisibility = async () => {
      if (!currentUsername) return;

      try {
        const userSpecificKey = getInfoCardKey(currentUsername);
        const isHidden = await AsyncStorage.getItem(userSpecificKey);
        setShowInfoCard(isHidden !== 'true');
      } catch (error) {
        console.error('Error checking info card visibility:', error);
      }
    };

    checkInfoCardVisibility();
  }, [currentUsername]);

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        setLoadedDetails(new Set());
        loadWorkoutHistory();
      }
    }, [token])
  );

  useEffect(() => {
    applyFilters();
  }, [allWorkouts, selectedMacrocycle, sortOrder]);

  const loadWorkoutHistory = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/workout-history?limit=100`, {
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
        const data = await response.json();
        setAllWorkouts(data);
        
        const macrocycles = [...new Set(
          data
            .filter((workout: WorkoutHistory) => workout.macrocycleName)
            .map((workout: WorkoutHistory) => workout.macrocycleName)
        )].sort();
        
        setAvailableMacrocycles(macrocycles);
      } else {
        Alert.alert('Error', 'No se pudo cargar el historial de entrenamientos');
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allWorkouts];

    if (selectedMacrocycle !== 'all') {
      if (selectedMacrocycle === 'free') {
        filtered = filtered.filter(workout => !workout.macrocycleName);
      } else {
        filtered = filtered.filter(workout => workout.macrocycleName === selectedMacrocycle);
      }
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.completedAt).getTime();
      const dateB = new Date(b.completedAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredWorkouts(filtered);
  };

  const loadWorkoutDetails = async (workoutId: number) => {
    if (!token) return;

    try {
      setLoadingDetails(true);
      
      const response = await fetch(`${API_URL}/workout-history/${workoutId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const detailedWorkout = await response.json();
        setAllWorkouts(prev => prev.map(workout => 
          workout.id === workoutId ? { ...workout, exercises: detailedWorkout.exercises } : workout
        ));
        setSelectedWorkout(prev => prev ? { ...prev, exercises: detailedWorkout.exercises } : null);
        setLoadedDetails(prev => new Set([...prev, workoutId]));
      }
    } catch (error) {
      console.error('Error cargando detalles del workout:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openWorkoutModal = async (workout: WorkoutHistory) => {
    setSelectedWorkout(workout);
    setModalVisible(true);
    
    const hasLoadedDetails = loadedDetails.has(workout.id);
    if ((!workout.exercises || workout.exercises.length === 0) && !hasLoadedDetails) {
      await loadWorkoutDetails(workout.id);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedWorkout(null);
  };

  const hideInfoCard = async () => {
    if (!currentUsername) return;

    try {
      const userSpecificKey = getInfoCardKey(currentUsername);
      await AsyncStorage.setItem(userSpecificKey, 'true');
      setShowInfoCard(false);
    } catch (error) {
      console.error('Error hiding info card:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const correctedDate = new Date(date.getTime() + (2 * 60 * 60 * 1000));
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const isToday = correctedDate.toDateString() === today.toDateString();
      const isYesterday = correctedDate.toDateString() === yesterday.toDateString();

      if (isToday) {
        return `Hoy, ${correctedDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
      } else if (isYesterday) {
        return `Ayer, ${correctedDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        return correctedDate.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch {
      return 'Fecha no disponible';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage === 100) return '#5E4B8B';
    if (percentage >= 80) return '#8B7AB8';
    return '#9CA3AF';
  };

  const getMacrocycleDisplayName = (macrocycleName: string) => {
    if (macrocycleName === 'all') return 'Todos';
    if (macrocycleName === 'free') return 'Entrenamientos Libres';
    return macrocycleName;
  };

  const renderFilters = () => {
    return (
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedMacrocycle === 'all' && styles.filterChipActive
            ]}
            onPress={() => setSelectedMacrocycle('all')}
          >
            <Text style={[
              styles.filterChipText,
              selectedMacrocycle === 'all' && styles.filterChipTextActive
            ]}>
              Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedMacrocycle === 'free' && styles.filterChipActive
            ]}
            onPress={() => setSelectedMacrocycle('free')}
          >
            <Text style={[
              styles.filterChipText,
              selectedMacrocycle === 'free' && styles.filterChipTextActive
            ]}>
              Libres
            </Text>
          </TouchableOpacity>

          {availableMacrocycles.map((macrocycle) => (
            <TouchableOpacity
              key={macrocycle}
              style={[
                styles.filterChip,
                selectedMacrocycle === macrocycle && styles.filterChipActive
              ]}
              onPress={() => setSelectedMacrocycle(macrocycle)}
            >
              <Text style={[
                styles.filterChipText,
                selectedMacrocycle === macrocycle && styles.filterChipTextActive
              ]}>
                {macrocycle}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
        >
          <Ionicons 
            name={sortOrder === 'desc' ? "arrow-down" : "arrow-up"} 
            size={16} 
            color="#5E4B8B" 
          />
          <Text style={styles.sortButtonText}>
            {sortOrder === 'desc' ? 'Más reciente' : 'Más antiguo'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderWorkoutCard = (workout: WorkoutHistory) => {
    return (
      <TouchableOpacity
        key={workout.id}
        style={[
          styles.workoutCard,
          workout.completionPercentage === 100 && styles.completedWorkoutCard
        ]}
        onPress={() => openWorkoutModal(workout)}
        activeOpacity={0.7}
      >
        <View style={styles.workoutCardHeader}>
          <View style={styles.workoutMainInfo}>
            <View style={styles.workoutTitleRow}>
              <Text style={styles.workoutTitle} numberOfLines={1}>
                {workout.routineName}
              </Text>
              <View style={styles.completionBadge}>
                <Text style={styles.completionText}>{workout.completionPercentage}%</Text>
              </View>
            </View>

            {workout.macrocycleName && (
              <View style={styles.macrocycleInfo}>
                <Ionicons name="calendar-outline" size={12} color="#8B7AB8" />
                <Text style={styles.macrocycleText}>
                  {workout.macrocycleName} - Día {workout.absoluteDay}
                </Text>
              </View>
            )}

            <Text style={styles.workoutDate}>
              {formatDate(workout.completedAt)}
            </Text>

            <View style={styles.workoutStats}>
              <View style={styles.statChip}>
                <Ionicons name="time-outline" size={14} color="#5E4B8B" />
                <Text style={styles.statText}>{formatDuration(workout.durationMinutes)}</Text>
              </View>
              
              <View style={styles.statChip}>
                <Ionicons name="barbell-outline" size={14} color="#5E4B8B" />
                <Text style={styles.statText}>{workout.completedSets}/{workout.totalSets} series</Text>
              </View>

              <View style={styles.statChip}>
                <Ionicons name="fitness-outline" size={14} color="#5E4B8B" />
                <Text style={styles.statText}>{workout.totalExercises} ejercicios</Text>
              </View>

              {workout.totalVolume && workout.totalVolume > 0 ? (
                <View style={styles.statChip}>
                  <Ionicons name="trending-up-outline" size={14} color="#5E4B8B" />
                  <Text style={styles.statText}>{Math.round(workout.totalVolume)} kg</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.workoutProgressBar}>
              <View 
                style={[
                  styles.workoutProgressFill, 
                  { 
                    width: `${workout.completionPercentage}%`,
                    backgroundColor: getCompletionColor(workout.completionPercentage)
                  }
                ]} 
              />
            </View>
          </View>

          <View style={styles.expandButton}>
            <Ionicons 
              name="eye-outline" 
              size={20} 
              color="#5E4B8B" 
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderModal = () => {
    if (!selectedWorkout) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selectedWorkout.routineName}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {formatDate(selectedWorkout.completedAt)}
                </Text>
                {selectedWorkout.macrocycleName && (
                  <Text style={styles.modalMacrocycle}>
                    {selectedWorkout.macrocycleName} - Día {selectedWorkout.absoluteDay}
                  </Text>
                )}
              </View>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedWorkout.routineDescription ? (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionText}>{selectedWorkout.routineDescription}</Text>
                </View>
              ) : null}

              {selectedWorkout.notes ? (
                <View style={styles.notesContainer}>
                  <View style={styles.notesHeader}>
                    <Ionicons name="document-text" size={16} color="#5E4B8B" />
                    <Text style={styles.notesLabel}>Notas del entrenamiento</Text>
                  </View>
                  <Text style={styles.notesText}>{selectedWorkout.notes}</Text>
                </View>
              ) : null}

              {loadingDetails ? (
                <View style={styles.loadingDetails}>
                  <ActivityIndicator size="small" color="#5E4B8B" />
                  <Text style={styles.loadingDetailsText}>Cargando detalles...</Text>
                </View>
              ) : (selectedWorkout.exercises && selectedWorkout.exercises.length > 0) || loadedDetails.has(selectedWorkout.id) ? (
                <View style={styles.exercisesList}>
                  {selectedWorkout.exercises && selectedWorkout.exercises.map((exercise, index) => (
                    <View key={index} style={styles.exerciseItem}>
                      <View style={styles.exerciseHeader}>
                        <Text style={styles.exerciseName}>
                          {exercise.exerciseOrder}. {exercise.exerciseName}
                        </Text>
                        {exercise.wasAddedDuringWorkout ? (
                          <View style={styles.addedBadge}>
                            <Text style={styles.addedBadgeText}>AÑADIDO</Text>
                          </View>
                        ) : null}
                      </View>
                      
                      <Text style={styles.exerciseMuscle}>{exercise.exerciseMuscle}</Text>
                      
                      <View style={styles.exerciseStatsRow}>
                        <Text style={styles.exerciseStatsText}>
                          {exercise.completedSets}/{exercise.plannedSets} series
                          {exercise.totalVolume && exercise.totalVolume > 0 ? 
                            ` • ${Math.round(exercise.totalVolume)} kg` : ''
                          }
                        </Text>
                      </View>

                      {exercise.sets && exercise.sets.length > 0 ? (
                        <View style={styles.setsContainer}>
                          {exercise.sets.map((set, setIndex) => (
                            <View key={setIndex} style={[
                              styles.setRow,
                              set.completed ? styles.setRowCompleted : styles.setRowIncomplete
                            ]}>
                              <View style={styles.exerciseNumber}>
                                <Text style={styles.setNumber}>S{set.setNumber}</Text> 
                              </View>
                              {set.completed ? (
                                <View style={styles.setDataContainer}>
                                  <Text style={styles.setData}>
                                    {set.actualReps} reps × {set.actualWeight}kg{formatRirRpe(set.actualRir, set.actualRpe)}
                                  </Text>
                                  {set.actualNotes ? (
                                    <Text style={styles.setNotes}>{set.actualNotes}</Text>
                                  ) : null}
                                </View>
                              ) : (
                                <Text style={styles.setDataIncomplete}>No completada</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noDetails}>
                  <Ionicons name="information-circle-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.noDetailsText}>No hay detalles disponibles</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Historial de Entrenamientos</Text>
          <Text style={styles.headerSubtitle}>
            {filteredWorkouts.length} entrenamientos{selectedMacrocycle !== 'all' ? ` - ${getMacrocycleDisplayName(selectedMacrocycle)}` : ''}
          </Text>
        </View>
      </View>

      {renderFilters()}

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filteredWorkouts.length > 0 && showInfoCard && currentUsername && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <View style={styles.infoHeaderLeft}>
                <Ionicons name="information-circle" size={20} color="#5E4B8B" />
                <Text style={styles.infoTitle}>Información</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButton2}
                onPress={hideInfoCard}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#8B7AB8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoText}>
              Toca cualquier entrenamiento para ver los detalles completos de ejercicios y series realizadas.
            </Text>
          </View>
        )}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5E4B8B" />
            <Text style={styles.loadingText}>Cargando historial...</Text>
          </View>
        ) : filteredWorkouts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="barbell-outline" size={64} color="#5E4B8B" />
            </View>
            <Text style={styles.emptyTitle}>
              {selectedMacrocycle === 'all' ? 'No hay entrenamientos' : 'No hay entrenamientos en este filtro'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedMacrocycle === 'all' 
                ? 'Cuando completes tus primeros entrenamientos aparecerán aquí'
                : 'Prueba con otro filtro o realiza entrenamientos de este tipo'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.workoutsList}>
            {filteredWorkouts.map(renderWorkoutCard)}
          </View>
        )}
      </ScrollView>

      {renderModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    marginBottom: 70
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#5E4B8B',
    fontWeight: '500',
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8B7AB8',
    fontWeight: '400',
    marginTop: 8,
  },
  filtersContainer: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterScrollContent: {
    paddingRight: 20,
  },
  filterChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#5E4B8B',
    borderColor: '#5E4B8B',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: 'white',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignSelf: 'flex-start',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5E4B8B',
    marginLeft: 6,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#F8FAFC',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  workoutsList: {
    gap: 16,
  },
  workoutCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#5E4B8B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  completedWorkoutCard: {
    borderLeftColor: '#5E4B8B',
    backgroundColor: '#F8FAFC',
  },
  workoutCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  workoutMainInfo: {
    flex: 1,
  },
  workoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  completionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#5E4B8B"
  },
  completionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  macrocycleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  macrocycleText: {
    fontSize: 12,
    color: '#8B7AB8',
    fontWeight: '500',
  },
  workoutDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  workoutStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statText: {
    fontSize: 12,
    color: '#5E4B8B',
    fontWeight: '600',
  },
  workoutProgressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  workoutProgressFill: {
    height: '100%',
    borderRadius: 3,
    borderColor: "#5E4B8B"
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'white',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalMacrocycle: {
    fontSize: 12,
    color: '#8B7AB8',
    fontWeight: '500',
    marginTop: 2,
  },
  modalContent: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FAFAFA',
  },
  descriptionContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  notesContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 10
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E4B8B',
  },
  notesText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  loadingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingDetailsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  exercisesList: {
    gap: 20,
  },
  exercisesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  exerciseItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#5E4B8B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5E4B8B',
    flex: 1,
  },
  addedBadge: {
    backgroundColor: '#5E4B8B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  addedBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  exerciseMuscle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  exerciseStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseStatsText: {
    fontSize: 13,
    color: '#5E4B8B',
    fontWeight: '600',
  },
  setsContainer: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  setRowCompleted: {
    backgroundColor: '#EDE9FE',
  },
  setRowIncomplete: {
    backgroundColor: '#F8FAFC',
  },
  setNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    width: 28,
    textAlign: 'center',
  },
  setData: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  setDataContainer: {
    flex: 1,
  },
  setNotes: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  setDataIncomplete: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    flex: 1,
    fontStyle: 'italic',
  },
  noDetails: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  noDetailsText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#FBF9FE',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EFEDFB',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5E4B8B',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  closeButton2: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
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
});

export default WorkoutHistoryScreen;