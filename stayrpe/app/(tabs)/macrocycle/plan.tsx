import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Routine {
  id: number;
  name: string;
  description: string;
}

interface DayPlan {
  dayNumber: number;
  routineId: number | null;
  isRestDay: boolean;
}

const PlanMacrocycleScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoutines, setLoadingRoutines] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const API_URL =  process.env.EXPO_PUBLIC_API_BASE;

  const macrocycleData = {
    name: params.name as string,
    description: params.description as string,
    startDate: params.startDate as string,
    microcycleDurationDays: parseInt(params.microcycleDurationDays as string),
    totalMicrocycles: parseInt(params.totalMicrocycles as string),
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

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        loadRoutines();
      }
    }, [token])
  );

  useEffect(() => {
    initializeDayPlans();
  }, [macrocycleData.microcycleDurationDays]);

  const loadRoutines = async () => {
    if (!token) return;
    try {
      setLoadingRoutines(true);
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
        setRoutines(data);
      }
    } catch (error) {
      console.error('Error cargando rutinas:', error);
    } finally {
      setLoadingRoutines(false);
    }
  };

  const initializeDayPlans = () => {
    const plans: DayPlan[] = [];
    for (let i = 1; i <= macrocycleData.microcycleDurationDays; i++) {
      plans.push({
        dayNumber: i,
        routineId: null,
        isRestDay: false
      });
    }
    setDayPlans(plans);
  };

  const updateDayPlan = (dayNumber: number, routineId: number | null, isRestDay: boolean) => {
    setDayPlans(prev => prev.map(plan => 
      plan.dayNumber === dayNumber 
        ? { ...plan, routineId, isRestDay }
        : plan
    ));
  };

  const selectRoutineForDay = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    setShowRoutineModal(true);
  };

  const assignRoutineToDay = (routineId: number | null, isRestDay: boolean = false) => {
    if (selectedDay) {
      updateDayPlan(selectedDay, routineId, isRestDay);
      setShowRoutineModal(false);
      setSelectedDay(null);
    }
  };

  const validatePlanning = () => {
    const unplannedDays = dayPlans.filter(plan => !plan.isRestDay && !plan.routineId);
    if (unplannedDays.length > 0) {
      Alert.alert('Error', `Faltan planificar los días: ${unplannedDays.map(d => d.dayNumber).join(', ')}`);
      return false;
    }
    return true;
  };

  const handleCreateMacrocycle = async () => {
    if (!token || !validatePlanning()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const fullMacrocycleData = {
        ...macrocycleData,
        dayPlans: dayPlans.map(plan => ({
          dayNumber: plan.dayNumber,
          routineId: plan.routineId,
          isRestDay: plan.isRestDay
        }))
      };

      const response = await fetch(`${API_URL}/macrocycles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fullMacrocycleData)
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("onboardingComplete");
        Alert.alert("Sesión Expirada", "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", [
          { text: "OK", onPress: () => router.replace("/") }
        ]);
        return;
      }

      const data = await response.json();
      if (response.ok) {
        Alert.alert(
          'Macrociclo Creado', 
          `"${data.name}" se ha creado correctamente con la planificación.`, 
          [{ text: 'OK', onPress: () => router.push('/(tabs)/macrocycle') }]
        );
      } else {
        Alert.alert('Error', data.error || 'Error al crear macrociclo');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayNumber: number) => {
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return dayNames[(dayNumber - 1) % 7];
  };

  const getSelectedRoutineName = (routineId: number | null) => {
    if (!routineId) return null;
    const routine = routines.find(r => r.id === routineId);
    return routine ? routine.name : 'Rutina no encontrada';
  };

  const handleRefreshRoutines = async () => {
    await loadRoutines();
  };

  if (!token || loadingRoutines) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E4B8B" />
          <Text style={styles.loadingText}>Cargando rutinas...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.headerTitle}>Planificar Días</Text>
            <Text style={styles.headerSubtitle}>{macrocycleData.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshRoutines}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={20} color="#5E4B8B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumen del Microciclo</Text>
          <Text style={styles.summaryText}>
            {macrocycleData.microcycleDurationDays} días • {macrocycleData.totalMicrocycles} microciclos
          </Text>
        </View>

        <View style={styles.planningCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar" size={20} color="#5E4B8B" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Planificación del Microciclo</Text>
                <Text style={styles.cardSubtitle}>
                  Asigna rutinas a cada día • {routines.length} rutinas disponibles
                </Text>
              </View>
            </View>
          </View>

          {routines.length === 0 ? (
            <View style={styles.emptyRoutines}>
              <Ionicons name="fitness" size={48} color="#9CA3AF" />
              <Text style={styles.emptyRoutinesText}>
                No tienes rutinas creadas. Debes crear al menos una rutina antes de planificar tu macrociclo.
              </Text>
              <TouchableOpacity
                style={styles.createRoutineButton}
                onPress={() => router.push('/(tabs)/routines/create')}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="white" />
                <Text style={styles.createRoutineButtonText}>Crear Rutina</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.dayPlansList}>
              {dayPlans.map((dayPlan) => (
                <View key={dayPlan.dayNumber} style={styles.dayPlanCard}>
                  <View style={styles.dayPlanHeader}>
                    <View style={styles.dayInfo}>
                      <Text style={styles.dayNumber}>Día {dayPlan.dayNumber}</Text>
                      <Text style={styles.dayName}>{getDayName(dayPlan.dayNumber)}</Text>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() => selectRoutineForDay(dayPlan.dayNumber)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dayPlanContent}>
                    {dayPlan.isRestDay ? (
                      <View style={styles.restDayContainer}>
                        <Ionicons name="bed" size={20} color="#5E4B8B" />
                        <Text style={styles.restDayText}>Día de descanso</Text>
                      </View>
                    ) : dayPlan.routineId ? (
                      <View style={styles.routineContainer}>
                        <Ionicons name="fitness" size={20} color="#5E4B8B" />
                        <Text style={styles.routineText}>
                          {getSelectedRoutineName(dayPlan.routineId)}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.unassignedContainer}>
                        <Ionicons name="help-circle" size={20} color="#5E4B8B" />
                        <Text style={styles.unassignedText}>Sin asignar</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.createButton,
            (loading || routines.length === 0) && styles.createButtonDisabled
          ]}
          onPress={handleCreateMacrocycle}
          disabled={loading || routines.length === 0}
          activeOpacity={0.9}
        >
          <View style={styles.createButtonContent}>
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.createButtonText}>Crear Macrociclo</Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showRoutineModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>
                Día {selectedDay} - {selectedDay ? getDayName(selectedDay) : ''}
              </Text>
              <Text style={styles.modalSubtitle}>Elige una rutina o día de descanso</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowRoutineModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.routineOption}
                onPress={() => assignRoutineToDay(null, true)}
                activeOpacity={0.7}
              >
                <View style={styles.routineOptionContent}>
                  <View style={[styles.routineIcon, styles.restIcon]}>
                    <Ionicons name="bed" size={24} color="#5E4B8B" />
                  </View>
                  <View style={styles.routineDetails}>
                    <Text style={styles.routineOptionName}>Día de descanso</Text>
                    <Text style={styles.routineOptionDescription}>
                      Tomate un descanso para recuperarte
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {routines.map((routine) => (
                <TouchableOpacity
                  key={routine.id}
                  style={styles.routineOption}
                  onPress={() => assignRoutineToDay(routine.id, false)}
                  activeOpacity={0.7}
                >
                  <View style={styles.routineOptionContent}>
                    <View style={[styles.routineIcon, styles.workoutIcon]}>
                      <Ionicons name="fitness" size={24} color="#5E4B8B" />
                    </View>
                    <View style={styles.routineDetails}>
                      <Text style={styles.routineOptionName}>{routine.name}</Text>
                      {routine.description && (
                        <Text style={styles.routineOptionExtra}>
                          {routine.description}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#EDE9FE',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5E4B8B',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#5E4B8B',
    fontWeight: '500',
  },
  planningCard: {
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyRoutines: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyRoutinesText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 24,
  },
  createRoutineButton: {
    backgroundColor: '#5E4B8B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createRoutineButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  dayPlansList: {
    gap: 12,
  },
  dayPlanCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayInfo: {
    flex: 1,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  dayName: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dayPlanContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  restDayText: {
    fontSize: 14,
    color: '#5E4B8B',
    fontWeight: '600',
  },
  routineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  routineText: {
    fontSize: 14,
    color: '#5E4B8B',
    fontWeight: '600',
    flex: 1,
  },
  unassignedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  unassignedText: {
    fontSize: 14,
    color: '#5E4B8B',
    fontWeight: '600',
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
    marginBottom: 70,
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
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  routineOption: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  routineOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  restIcon: {
    backgroundColor: '#F3F4F6',
  },
  workoutIcon: {
    backgroundColor: '#F3F4F6',
  },
  routineDetails: {
    flex: 1,
  },
  routineOptionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  routineOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  routineOptionExtra: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default PlanMacrocycleScreen;