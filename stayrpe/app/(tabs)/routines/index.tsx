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
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface RoutineExercise {
  id: number;
  exerciseId: number;
  exerciseName: string;
  exerciseMuscle: string;
  order: number;
  numberOfSets: number;
  restBetweenSets: number;
  notes: string;
  sets: ExerciseSet[];
}

interface ExerciseSet {
  id: number;
  setNumber: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeight: number;
  rir: number;
  rpe: number;
  notes: string;
}

interface Routine {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  totalExercises: number;
  totalSets: number;
  exercises?: RoutineExercise[];
}

const AnimatedIcon = ({ name, size = 20, color, isRotated = false, style = {} }) => {
  return (
    <View style={[
      {
        transform: [{ rotate: isRotated ? '180deg' : '0deg' }],
      },
      style
    ]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
};

const RoutinesScreen = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [showInfoCard, setShowInfoCard] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [routineDetails, setRoutineDetails] = useState<Record<number, RoutineExercise[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set());
  
  const router = useRouter();

  const API_URL =  process.env.EXPO_PUBLIC_API_BASE;

  const getInfoCardKey = (username: string) => `routines_info_hidden_${username}`;

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
        loadRoutines();
      }
    }, [token])
  );

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

  const loadRoutines = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/routines`, {
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
        
        const routinesWithCounts = data.map((routine: any) => ({
          ...routine,
          totalExercises: routine.totalExercises ?? (routine.exercises?.length || 0),
          totalSets: routine.totalSets ?? calculateTotalSets(routine)
        }));
        
        setRoutines(routinesWithCounts);
        setRoutineDetails({});
      } else {
        console.error('Error cargando rutinas:', response.status);
        Alert.alert('Error', 'No se pudieron cargar las rutinas');
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const loadRoutineDetails = async (routineId: number, forceReload = false) => {
    if (!token || (routineDetails[routineId] && !forceReload)) return;

    try {
      setLoadingDetails(prev => new Set(prev).add(routineId));
      
      const response = await fetch(`${API_URL}/routines/${routineId}`, {
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
        setRoutineDetails(prev => ({
          ...prev,
          [routineId]: data.exercises || []
        }));
      } else {
        console.error('Error cargando detalles de rutina:', response.status);
      }
    } catch (error) {
      console.error('Error de conexión al cargar detalles de rutina:', error);
    } finally {
      setLoadingDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(routineId);
        return newSet;
      });
    }
  };

  const toggleExpanded = async (routineId: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    const isCurrentlyExpanded = expandedItems.has(routineId);
    
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(routineId)) {
        newSet.delete(routineId);
      } else {
        newSet.add(routineId);
      }
      return newSet;
    });

    if (!isCurrentlyExpanded) {
      await loadRoutineDetails(routineId, true);
    }
  };

  const invalidateRoutineDetails = (routineId: number) => {
    setRoutineDetails(prev => {
      const { [routineId]: removed, ...rest } = prev;
      return rest;
    });
  };

  const startFreeWorkout = (routine: Routine) => {
    Alert.alert(
      'Entrenamiento Libre',
      `¿Quieres iniciar un entrenamiento libre con la rutina "${routine.name}"?\n\nEste entrenamiento no formará parte de ningún macrociclo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: () => {
            router.push({
              pathname: '/workout',
              params: {
                routineId: routine.id.toString(),
                routineName: routine.name,
              }
            });
          }
        }
      ]
    );
  };

  const calculateTotalSets = (routine: any) => {
    if (!routine.exercises) return 0;
    
    return routine.exercises.reduce((total: number, exercise: any) => {
      const exerciseSets = exercise.sets?.length || exercise.numberOfSets || 0;
      return total + exerciseSets;
    }, 0);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutines();
    setRefreshing(false);
  };

  const editRoutine = async (routineId: number, routineName: string) => {
    try {
      const response = await fetch(`${API_URL}/routines/${routineId}`, {
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
        const routineDetails = await response.json();
        
        invalidateRoutineDetails(routineId);
        
        router.push({
          pathname: '/(tabs)/routines/create',
          params: { 
            routineId: routineId.toString(),
            routineData: JSON.stringify(routineDetails),
            isEditing: 'true'
          }
        });
      } else {
        Alert.alert('❌ Error', 'No se pudieron cargar los detalles de la rutina');
      }
    } catch (error) {
      console.error('Error obteniendo detalles de rutina:', error);
      Alert.alert('❌ Error', 'Error de conexión');
    }
  };

  const deleteRoutine = async (routineId: number, routineName: string) => {
    Alert.alert(
      'Eliminar Rutina',
      `¿Estás seguro de que quieres eliminar "${routineName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/routines/${routineId}`, {
                method: 'DELETE',
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
                Alert.alert('Eliminada', 'Rutina eliminada correctamente');
                loadRoutines();
                
                setExpandedItems(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(routineId);
                  return newSet;
                });
                setRoutineDetails(prev => {
                  const { [routineId]: removed, ...rest } = prev;
                  return rest;
                });
              } else {
                let errorMessage = 'No se pudo eliminar la rutina';
                
                try {
                  const responseText = await response.text();
                  
                  if (responseText) {
                    try {
                      const errorData = JSON.parse(responseText);
                      if (errorData.error) {
                        errorMessage = errorData.error;
                      } else if (errorData.message) {
                        errorMessage = errorData.message;
                      }
                    } catch (jsonError) {
                      console.log('Respuesta no es JSON válido:', responseText);
                    }
                  }
                } catch (textError) {
                  console.error('Error leyendo respuesta:', textError);
                }
                
                if (errorMessage === 'No se pudo eliminar la rutina') {
                  switch (response.status) {
                    case 409:
                      errorMessage = 'No se puede eliminar la rutina porque está siendo utilizada en uno o más macrociclos activos. Primero elimina o archiva los macrociclos que la usan.';
                      break;
                    case 400:
                      errorMessage = 'La rutina no se puede eliminar porque está en uso.';
                      break;
                    case 403:
                      errorMessage = 'No tienes permisos para eliminar esta rutina.';
                      break;
                    case 404:
                      errorMessage = 'La rutina no existe o ya fue eliminada.';
                      break;
                    case 500:
                      errorMessage = 'Error interno del servidor. Intenta de nuevo más tarde.';
                      break;
                    default:
                      errorMessage = `Error del servidor (${response.status}). No se pudo eliminar la rutina.`;
                  }
                }

                console.log(`Error ${response.status} eliminando rutina:`, errorMessage);
                
                Alert.alert(
                  '❌ No se puede eliminar', 
                  errorMessage,
                  [{ text: 'Entendido' }]
                );
              }
            } catch (error) {
              console.error('Error de red eliminando rutina:', error);
              Alert.alert(
                '❌ Error de Conexión', 
                'No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta de nuevo.',
                [{ text: 'Entendido' }]
              );
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Fecha no disponible';
    }
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Mis Rutinas</Text>
            <Text style={styles.headerSubtitle}>
              {routines.length} rutina{routines.length !== 1 ? 's' : ''} disponible{routines.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/(tabs)/routines/create')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.createButtonText}>Nueva</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#5E4B8B']}
            tintColor="#5E4B8B"
          />
        }
      >
        {routines.length > 0 && showInfoCard && currentUsername && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <View style={styles.infoHeaderLeft}>
                <Ionicons name="information-circle" size={20} color="#5E4B8B" />
                <Text style={styles.infoTitle}>Información</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={hideInfoCard}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#8B7AB8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoText}>
              • Toca "Entrenar" para iniciar un entrenamiento libre{'\n'}
              • Los entrenamientos libres no afectan tu progreso en macrociclos{'\n'}
              • Toca el ícono de flecha para ver los ejercicios{'\n'}
              • Las rutinas usadas en macrociclos activos no se pueden eliminar
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5E4B8B" />
            <Text style={styles.loadingText}>Cargando rutinas...</Text>
          </View>
        ) : routines.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="barbell" size={64} color="#5E4B8B" />
            </View>
            <Text style={styles.emptyTitle}>¡Comienza tu entrenamiento!</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primera rutina personalizada para alcanzar tus objetivos
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/routines/create')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.emptyButtonText}>Crear Primera Rutina</Text>
            </TouchableOpacity>

            {showInfoCard && currentUsername && (
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <View style={styles.infoHeaderLeft}>
                    <Ionicons name="information-circle" size={20} color="#5E4B8B" />
                    <Text style={styles.infoTitle}>¿Qué es una rutina?</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={hideInfoCard}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={18} color="#8B7AB8" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.infoText}>
                  Una rutina es una secuencia planificada de ejercicios con series, repeticiones y pesos específicos. Las rutinas se pueden usar en macrociclos o como entrenamientos libres.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.routinesList}>
            {routines.map((routine) => {
              const isExpanded = expandedItems.has(routine.id);
              const exercises = routineDetails[routine.id] || [];
              const isLoadingExercises = loadingDetails.has(routine.id);

              return (
                <View key={routine.id} style={styles.routineCard}>
                  <View style={styles.routineHeader}>
                    <View style={styles.routineInfo}>
                      <Text style={styles.routineName}>{routine.name}</Text>
                      {routine.description && (
                        <Text style={styles.routineDescription}>{routine.description}</Text>
                      )}
                      <View style={styles.routineStats}>
                        <View style={styles.statChip}>
                          <Ionicons name="barbell-outline" size={14} color="#5E4B8B" />
                          <Text style={styles.statText}>
                            {routine.totalExercises || 0} ejercicios
                          </Text>
                        </View>
                        <View style={styles.statChip}>
                          <Ionicons name="layers-outline" size={14} color="#5E4B8B" />
                          <Text style={styles.statText}>
                            {routine.totalSets || 0} series
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.routineDate}>
                        Creada el {formatDate(routine.createdAt)}
                      </Text>
                    </View>
                    
                    <View style={styles.routineActions}>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.workoutButton]}
                        onPress={() => startFreeWorkout(routine)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="play" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => editRoutine(routine.id, routine.name)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="pencil" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => deleteRoutine(routine.id, routine.name)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.expandButton]}
                        onPress={() => toggleExpanded(routine.id)}
                        activeOpacity={0.7}
                      >
                        <AnimatedIcon 
                          name="chevron-down" 
                          size={16} 
                          color="white"
                          isRotated={isExpanded}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={styles.exercisesHeader}>
                        <View style={styles.exercisesTitleRow}>
                          <View style={styles.exercisesIconContainer}>
                            <Ionicons name="barbell" size={18} color="#5E4B8B" />
                          </View>
                          <Text style={styles.exercisesTitle}>Ejercicios</Text>
                        </View>
                        <Text style={styles.exercisesSubtitle}>
                          Lista completa de ejercicios en esta rutina
                        </Text>
                      </View>

                      {isLoadingExercises ? (
                        <View style={styles.exercisesLoading}>
                          <ActivityIndicator size="small" color="#5E4B8B" />
                          <Text style={styles.exercisesLoadingText}>Cargando ejercicios...</Text>
                        </View>
                      ) : exercises.length === 0 ? (
                        <View style={styles.noExercisesContainer}>
                          <View style={styles.noExercisesIconContainer}>
                            <Ionicons name="barbell-outline" size={24} color="#8B7AB8" />
                          </View>
                          <Text style={styles.noExercisesText}>
                            Esta rutina no tiene ejercicios configurados
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.exercisesList}>
                          {exercises.map((exercise, index) => (
                            <View key={exercise.id} style={styles.exerciseItem}>
                              <View style={styles.exerciseNumber}>
                                <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                              </View>
                              
                              <View style={styles.exerciseContent}>
                                <View style={styles.exerciseMainInfo}>
                                  <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                                  <Text style={styles.exerciseMuscle}>{exercise.exerciseMuscle}</Text>
                                </View>
                                
                                <View style={styles.exerciseStats}>
                                  <View style={styles.exerciseStatItem}>
                                    <Ionicons name="layers-outline" size={12} color="#5E4B8B" />
                                    <Text style={styles.exerciseStatText}>
                                      {exercise.sets?.length || exercise.numberOfSets} series
                                    </Text>
                                  </View>
                                  {exercise.restBetweenSets > 0 && (
                                    <View style={styles.exerciseStatItem}>
                                      <Ionicons name="time-outline" size={12} color="#5E4B8B" />
                                      <Text style={styles.exerciseStatText}>
                                        {exercise.restBetweenSets}s descanso
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            </View>
                          ))}
                          <TouchableOpacity
                            style={styles.workoutButtonLarge}
                            onPress={() => startFreeWorkout(routine)}
                            activeOpacity={0.8}
                          >
                            <View style={styles.workoutButtonContent}>
                              <View style={styles.workoutButtonIconContainer}>
                                <Ionicons name="play" size={15} color="white" />
                              </View>
                              <View style={styles.workoutButtonTextContainer}>
                                <Text style={styles.workoutButtonTitle}>Entrenar</Text>
                                <Text style={styles.workoutButtonSubtitle}>Entrenamiento libre</Text>
                              </View>
                              <Ionicons name="chevron-forward" size={20} color="white" />
                            </View>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    marginBottom:50
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
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
    color: '#6B5B95',
    fontWeight: '400',
  },
  createButton: {
    backgroundColor: '#5E4B8B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
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
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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
    backgroundColor: '#F3F4F6',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#D6CDE8',
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
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
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#5E4B8B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 32,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 17,
  },
  routinesList: {
    gap: 16,
  },
  routineCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 10,
    marginBottom: 16,
  },
  routineInfo: {
    flex: 1,
    marginRight: 16,
  },
  routineName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  routineDescription: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  routineStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  routineDate: {
    fontSize: 13,
    color: '#8B7AB8',
    fontWeight: '400',
    marginTop: 8,
  },
  routineActions: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  workoutButton: {
    backgroundColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOpacity: 0.25,
  },
  editButton: {
    backgroundColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOpacity: 0.25,
  },
  deleteButton: {
    backgroundColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOpacity: 0.25,
  },
  expandButton: {
    backgroundColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOpacity: 0.2,
  },
  workoutButtonLarge: {
    backgroundColor: '#5E4B8B',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  workoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  workoutButtonIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutButtonTextContainer: {
    flex: 1,
  },
  workoutButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  workoutButtonSubtitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  exercisesHeader: {
    marginBottom: 16,
    paddingTop: 16,
  },
  exercisesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  exercisesIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8F7FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  exercisesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  exercisesSubtitle: {
    fontSize: 14,
    color: '#6B5B95',
    fontWeight: '500',
  },
  exercisesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  exercisesLoadingText: {
    fontSize: 14,
    color: '#6B5B95',
    fontWeight: '500',
  },
  noExercisesContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noExercisesIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F7FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  noExercisesText: {
    fontSize: 14,
    color: '#8B7AB8',
    textAlign: 'center',
    fontWeight: '500',
  },
  exercisesList: {
    gap: 12,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  exerciseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E4B8B',
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseMainInfo: {
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  exerciseMuscle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  exerciseStats: {
    flexDirection: 'row',
    gap: 12,
  },
  exerciseStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  exerciseStatText: {
    fontSize: 11,
    color: '#5E4B8B',
    fontWeight: '500',
  },
});

export default RoutinesScreen;