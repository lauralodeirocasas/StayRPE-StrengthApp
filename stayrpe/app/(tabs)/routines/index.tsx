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
  RefreshControl
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';


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
  exercises?: RoutineExercise[]; // Para cuando obtenemos detalles completos
}

const RoutinesScreen = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  const API_URL = 'http://192.168.0.57:8080';

  // Cargar token al inicializar
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

  // Cargar rutinas cuando se obtiene el token o cuando se enfoca la pantalla
  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        loadRoutines();
      }
    }, [token])
  );

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

      // 🔥 VERIFICACIÓN TOKEN EXPIRADO
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
        console.log('📋 Rutinas recibidas del backend:', data);
        
        // Si el backend devuelve RoutineListResponse, ya tiene totalExercises y totalSets
        // Si no, las calculamos manualmente
        const routinesWithCounts = data.map((routine: any) => ({
          ...routine,
          // Si el backend ya envía estos valores, los usamos; si no, los calculamos
          totalExercises: routine.totalExercises ?? (routine.exercises?.length || 0),
          totalSets: routine.totalSets ?? calculateTotalSets(routine)
        }));
        
        console.log('📊 Rutinas procesadas:', routinesWithCounts);
        setRoutines(routinesWithCounts);
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

  // Función auxiliar para calcular series totales si el backend no las envía
  const calculateTotalSets = (routine: any) => {
    if (!routine.exercises) return 0;
    
    return routine.exercises.reduce((total: number, exercise: any) => {
      // Puede ser exercise.sets.length o exercise.numberOfSets
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
    // Obtener los detalles completos de la rutina
    const response = await fetch(`${API_URL}/routines/${routineId}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
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

    if (response.ok) {
      const routineDetails = await response.json();
      console.log('📋 Detalles de rutina para edición:', routineDetails);
      
      // CAMBIO: Navegar a create en lugar de edit-routine
      router.push({
        pathname: '/(tabs)/routines/create',
        params: { 
          routineId: routineId.toString(),
          routineData: JSON.stringify(routineDetails),
          isEditing: 'true' // Flag para indicar que es edición
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

  const showRoutineActions = (routine: Routine) => {
    Alert.alert(
      routine.name,
      'Selecciona una acción',
      [
        {
          text: 'Ver Detalles',
          onPress: () => viewRoutineDetails(routine)
        },
        {
          text: 'Editar',
          onPress: () => editRoutine(routine.id, routine.name)
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteRoutine(routine.id, routine.name)
        },
        {
          text: 'Cancelar',
          style: 'cancel'
        }
      ]
    );
  };

  const viewRoutineDetails = async (routine: Routine) => {
    try {
      // Si ya tenemos los ejercicios, usarlos; si no, cargarlos
      let routineWithExercises = routine;
      
      if (!routine.exercises) {
        const response = await fetch(`${API_URL}/routines/${routine.id}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // 🔥 VERIFICACIÓN TOKEN EXPIRADO
        if (response.status === 401) {
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("onboardingComplete");
          Alert.alert("Sesión Expirada", "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", [
            { text: "OK", onPress: () => router.replace("/") }
          ]);
          return;
        }
        
        if (response.ok) {
          routineWithExercises = await response.json();
        }
      }
      
      const exercisesList = routineWithExercises.exercises?.map((ex, index) => 
        `${index + 1}. ${ex.exerciseName} (${ex.sets?.length || ex.numberOfSets} series)`
      ).join('\n') || 'Sin ejercicios';

      const totalExercises = routineWithExercises.exercises?.length || routine.totalExercises || 0;
      const totalSets = routineWithExercises.exercises ? 
        calculateTotalSets(routineWithExercises) : 
        routine.totalSets || 0;

      Alert.alert(
        `📋 ${routine.name}`,
        `${routine.description ? routine.description + '\n\n' : ''}` +
        `📅 Creada: ${formatDate(routine.createdAt)}\n` +
        `💪 ${totalExercises} ejercicios\n` +
        `🔢 ${totalSets} series totales\n\n` +
        `Ejercicios:\n${exercisesList}`,
        [{ text: 'Cerrar' }]
      );
    } catch (error) {
      console.error('Error cargando detalles:', error);
      // Mostrar información básica si no se pueden cargar los detalles
      Alert.alert(
        `📋 ${routine.name}`,
        `${routine.description ? routine.description + '\n\n' : ''}` +
        `📅 Creada: ${formatDate(routine.createdAt)}\n` +
        `💪 ${routine.totalExercises || 0} ejercicios\n` +
        `🔢 ${routine.totalSets || 0} series totales`,
        [{ text: 'Cerrar' }]
      );
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

              // 🔥 VERIFICACIÓN TOKEN EXPIRADO
              if (response.status === 401) {
                await AsyncStorage.removeItem("token");
                await AsyncStorage.removeItem("onboardingComplete");
                Alert.alert("Sesión Expirada", "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", [
                  { text: "OK", onPress: () => router.replace("/") }
                ]);
                return;
              }

              if (response.ok) {
                Alert.alert('✅ Eliminada', 'Rutina eliminada correctamente');
                loadRoutines(); // Recargar la lista
              } else {
                Alert.alert('❌ Error', 'No se pudo eliminar la rutina');
              }
            } catch (error) {
              console.error('Error eliminando rutina:', error);
              Alert.alert('❌ Error', 'Error de conexión');
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
      {/* Header moderno */}
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

      {/* Lista de rutinas */}
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
          </View>
        ) : (
          <View style={styles.routinesList}>
            {routines.map((routine) => (
              <TouchableOpacity 
                key={routine.id} 
                style={styles.routineCard}
                onPress={() => showRoutineActions(routine)}
                activeOpacity={0.7}
              >
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
                      style={[styles.actionButton, styles.editButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        editRoutine(routine.id, routine.name);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil" size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        deleteRoutine(routine.id, routine.name);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Preview de ejercicios - Solo si tenemos la data completa */}
                {routine.exercises && routine.exercises.length > 0 && (
                  <View style={styles.exercisesPreview}>
                    <Text style={styles.previewTitle}>Ejercicios incluidos:</Text>
                    <View style={styles.exercisesList}>
                      {routine.exercises.slice(0, 3).map((exercise, index) => (
                        <View key={index} style={styles.exercisePreviewItem}>
                          <View style={styles.exerciseNumber}>
                            <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                          </View>
                          <View style={styles.exercisePreviewInfo}>
                            <Text style={styles.exercisePreviewName}>{exercise.exerciseName}</Text>
                            <Text style={styles.exercisePreviewSets}>
                              {exercise.sets?.length || exercise.numberOfSets} series
                            </Text>
                          </View>
                        </View>
                      ))}
                      {routine.exercises.length > 3 && (
                        <Text style={styles.moreExercises}>
                          +{routine.exercises.length - 3} ejercicios más...
                        </Text>
                      )}
                    </View>
                  </View>
                )}

              </TouchableOpacity>
            ))}
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
    color: '#6B7280',
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
    borderWidth: 2,
    borderColor: '#F1F5F9',
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
    color: '#9CA3AF',
    fontWeight: '400',
  },
  routineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#F8FAFC',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  exercisesPreview: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  exercisesList: {
    gap: 8,
  },
  exercisePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E4B8B',
  },
  exercisePreviewInfo: {
    flex: 1,
  },
  exercisePreviewName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  exercisePreviewSets: {
    fontSize: 12,
    color: '#6B7280',
  },
  moreExercises: {
    fontSize: 13,
    color: '#5E4B8B',
    fontStyle: 'italic',
    marginTop: 4,
    paddingLeft: 36,
  },
});

export default RoutinesScreen;