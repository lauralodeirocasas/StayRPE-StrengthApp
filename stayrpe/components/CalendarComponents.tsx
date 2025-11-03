import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// ============================================================================
// INTERFACES
// ============================================================================

interface Macrocycle {
  id: number;
  name: string;
  startDate: string;
  microcycleDurationDays: number;
  totalMicrocycles: number;
  isCurrentlyActive: boolean;
}

interface DayPlan {
  dayNumber: number;
  isRestDay: boolean;
  routineName: string | null;
  routineId: number | null;
}

interface SelectedDayInfo {
  date: Date;
  dayPlan: DayPlan | null;
  dayOfCycle?: number;
  isInMacrocycle: boolean;
  absoluteDay?: number;
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

export const formatDate = (date: Date) => {
  return date.getDate().toString();
};

export const getDayName = (date: Date) => {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days[date.getDay()];
};

export const getMonthName = (date: Date) => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[date.getMonth()];
};

export const isCurrentMonth = (date: Date, monthOffset: number) => {
  const today = new Date();
  const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  return date.getMonth() === targetMonth.getMonth();
};

export const getNavigationTitle = (viewMode: 'week' | 'month', currentWeek: Date[], monthOffset: number) => {
  if (viewMode === 'week' && currentWeek.length > 0) {
    return currentWeek[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  } else if (viewMode === 'month') {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return `${getMonthName(targetDate)} ${targetDate.getFullYear()}`;
  }
  return '';
};

export const getDayInfo = (date: Date, activeMacrocycle: Macrocycle | null, dayPlans: DayPlan[]) => {
  if (!activeMacrocycle || dayPlans.length === 0) return null;

  const startDate = new Date(activeMacrocycle.startDate + 'T00:00:00.000Z');
  const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startDateNormalized = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  
  const diffTime = checkDate.getTime() - startDateNormalized.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;

  const totalDays = activeMacrocycle.microcycleDurationDays * activeMacrocycle.totalMicrocycles;
  if (diffDays >= totalDays) return null;

  const dayOfCycle = (diffDays % activeMacrocycle.microcycleDurationDays) + 1;
  const dayPlan = dayPlans.find(plan => plan.dayNumber === dayOfCycle);

  return {
    ...dayPlan,
    absoluteDay: diffDays + 1
  };
};

// Función helper para crear headers API
const createApiHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});

// Función para verificar si un día está completado
const checkIfDayCompleted = async (
  macrocycleId: number, 
  absoluteDay: number, 
  token: string,
  apiUrl: string = (process.env.EXPO_PUBLIC_API_BASE as string)
): Promise<boolean> => {
  try {
    console.log(`🔍 Verificando día ${absoluteDay} del macrociclo ${macrocycleId}...`);
    
    const response = await fetch(
      `${apiUrl}/workout-history/check-day?macrocycleId=${macrocycleId}&absoluteDay=${absoluteDay}`,
      {
        headers: createApiHeaders(token)
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`🔍 Resultado: día ${absoluteDay} ${data.alreadyTrained ? 'COMPLETADO' : 'NO completado'}`);
      return data.alreadyTrained || false;
    }
  } catch (error) {
    console.error(`❌ Error verificando día ${absoluteDay}:`, error);
  }
  return false;
};

// ============================================================================
// COMPONENTE DE BOTÓN DE ENTRENAMIENTO DE HOY
// ============================================================================

interface TodayWorkoutButtonProps {
  activeMacrocycle: Macrocycle | null;
  dayPlans: DayPlan[];
  customizedDays: Set<number>;
  onStartWorkout: (routineId: number, routineName: string) => void;
  onCustomizeDay: (absoluteDay: number, dayInfo: any) => void;
  onNavigateToRoutines: () => void;
  onNavigateToHistory: () => void;
  token: string | null;
}

export const TodayWorkoutButton: React.FC<TodayWorkoutButtonProps> = ({
  activeMacrocycle,
  dayPlans,
  customizedDays,
  onStartWorkout,
  onCustomizeDay,
  onNavigateToRoutines,
  onNavigateToHistory,
  token
}) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const dayInfo = getDayInfo(today, activeMacrocycle, dayPlans);
  
  // Verificar si el día está completado
  useEffect(() => {
    const checkCompleted = async () => {
      if (dayInfo?.absoluteDay && activeMacrocycle && token) {
        setLoading(true);
        const completed = await checkIfDayCompleted(
          activeMacrocycle.id,
          dayInfo.absoluteDay,
          token
        );
        setIsCompleted(completed);
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    checkCompleted();
  }, [dayInfo?.absoluteDay, activeMacrocycle?.id, token]);

  if (!activeMacrocycle) return null;

  const startDate = new Date(activeMacrocycle.startDate + 'T00:00:00.000Z');
  const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDateNormalized = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const diffTime = checkDate.getTime() - startDateNormalized.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const totalDays = activeMacrocycle.microcycleDurationDays * activeMacrocycle.totalMicrocycles;
  
  // Día fuera del macrociclo
  if (diffDays < 0 || diffDays >= totalDays) {
    return (
      <View style={styles.todayWorkoutContainer}>
        <View style={[styles.workoutCard, styles.noWorkoutCard]}>
          <View style={styles.workoutHeader}>
            <View style={[styles.workoutIconContainer, styles.noWorkoutIconContainer]}>
              <Ionicons name="calendar-outline" size={24} color="#9CA3AF" />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>Hoy</Text>
              <Text style={styles.workoutSubtitle}>No hay rutina programada</Text>
            </View>
            <View style={[styles.todayBadge, styles.freeDayBadge]}>
              <Text style={styles.todayBadgeText}>LIBRE</Text>
            </View>
          </View>
          
          <View style={styles.freeDay}>
            <Text style={styles.freeDayText}>
              Este día no forma parte de tu macrociclo activo. Puedes descansar o hacer actividad libre.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Sin planificación
  if (!dayInfo) {
    return (
      <View style={styles.todayWorkoutContainer}>
        <View style={[styles.workoutCard, styles.noWorkoutCard]}>
          <View style={styles.workoutHeader}>
            <View style={[styles.workoutIconContainer, styles.noWorkoutIconContainer]}>
              <Ionicons name="help-circle-outline" size={24} color="#F59E0B" />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>Hoy</Text>
              <Text style={styles.workoutSubtitle}>Sin planificación</Text>
            </View>
            <View style={[styles.todayBadge, styles.warningBadge]}>
              <Text style={styles.todayBadgeText}>SIN PLAN</Text>
            </View>
          </View>
          
          <View style={styles.freeDay}>
            <Text style={styles.freeDayText}>
              No hay planificación para este día en tu macrociclo.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Día de descanso
  if (dayInfo.isRestDay) {
    return (
      <View style={styles.todayWorkoutContainer}>
        <View style={[styles.workoutCard, styles.restDayCard]}>
          <View style={styles.workoutHeader}>
            <View style={[styles.workoutIconContainer, styles.restIconContainer]}>
              <Ionicons name="bed" size={24} color="#5E4B8B" />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>Hoy es día de descanso</Text>
              <Text style={styles.workoutSubtitle}>Tu cuerpo necesita recuperarse</Text>
            </View>
            <View style={[styles.todayBadge, styles.restBadge]}>
              <Text style={styles.todayBadgeText}>DESCANSO</Text>
            </View>
          </View>
          
          <View style={styles.restDayContent}>
            <View style={styles.restTips}>
              <View style={styles.restTip}>
                <Ionicons name="water" size={16} color="#5E4B8B" />
                <Text style={styles.restTipText}>Mantente hidratado</Text>
              </View>
              <View style={styles.restTip}>
                <Ionicons name="moon" size={16} color="#5E4B8B" />
                <Text style={styles.restTipText}>Duerme 7-9 horas</Text>
              </View>
              <View style={styles.restTip}>
                <Ionicons name="walk" size={16} color="#5E4B8B" />
                <Text style={styles.restTipText}>Actividad ligera opcional</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Sin rutina asignada
  if (!dayInfo.routineId || !dayInfo.routineName) {
    return (
      <View style={styles.todayWorkoutContainer}>
        <View style={[styles.workoutCard, styles.noRoutineCard]}>
          <View style={styles.workoutHeader}>
            <View style={[styles.workoutIconContainer, styles.warningIconContainer]}>
              <Ionicons name="alert-circle" size={24} color="#F59E0B" />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>Día de entrenamiento</Text>
              <Text style={styles.workoutSubtitle}>Sin rutina asignada</Text>
            </View>
            <View style={[styles.todayBadge, styles.warningBadge]}>
              <Text style={styles.todayBadgeText}>SIN RUTINA</Text>
            </View>
          </View>
          
          <View style={styles.noRoutineContent}>
            <Text style={styles.noRoutineText}>
              Hoy tienes programado entrenamiento, pero no hay una rutina específica asignada.
            </Text>
            
            <TouchableOpacity
              style={styles.createRoutineButton}
              onPress={onNavigateToRoutines}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={20} color="#5E4B8B" />
              <Text style={styles.createRoutineButtonText}>Ver rutinas disponibles</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Entrenamiento programado
  const isCustomized = dayInfo.absoluteDay ? customizedDays.has(dayInfo.absoluteDay) : false;
  
  return (
    <View style={styles.todayWorkoutContainer}>
      <View style={styles.workoutCard}>
        <View style={styles.workoutHeader}>
          <View style={styles.workoutIconContainer}>
            <Ionicons name="barbell" size={24} color="#5E4B8B" />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutTitle}>Entrenamiento de hoy</Text>
            <Text style={styles.workoutSubtitle}>{dayInfo.routineName}</Text>
            
            {isCustomized && !isCompleted && (
              <Text style={styles.customizationSubtitle}>
                Has personalizado algunos ejercicios
              </Text>
            )}
          </View>
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>HOY</Text>
          </View>
        </View>
        
        <View style={styles.workoutButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.startWorkoutButton,
              isCompleted && styles.disabledWorkoutButton
            ]}
            onPress={() => {
              if (isCompleted) {
                Alert.alert(
                  'Entrenamiento ya completado',
                  'Ya has completado el entrenamiento de hoy. ¿Quieres ver tu historial?',
                  [
                    { text: 'Cancelar' },
                    { 
                      text: 'Ver Historial', 
                      onPress: onNavigateToHistory
                    }
                  ]
                );
                return;
              }
              onStartWorkout(dayInfo.routineId, dayInfo.routineName!);
            }}
            disabled={loading || isCompleted}
            activeOpacity={isCompleted ? 1 : 0.9}
          >
            <View style={styles.startButtonContent}>
              <Ionicons 
                name={isCompleted ? "checkmark-circle" : "play-circle"} 
                size={24} 
                color="white" 
              />
              <Text style={styles.startButtonText}>
                {loading ? "Verificando..." : 
                 isCompleted ? "Entrenamiento Completado" : "Comenzar Entrenamiento"}
              </Text>
              {!isCompleted && !loading && (
                <Ionicons name="arrow-forward" size={20} color="white" />
              )}
            </View>
          </TouchableOpacity>

          {!isCompleted && !loading && (
            <TouchableOpacity
              style={styles.customizeTodayButton}
              onPress={() => {
                if (dayInfo.absoluteDay) {
                  onCustomizeDay(dayInfo.absoluteDay, dayInfo);
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="settings" size={18} color="#5E4B8B" />
              <Text style={styles.customizeTodayButtonText}>
                Editar rutina
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// COMPONENTE DEL MODAL DEL DÍA
// ============================================================================

interface DayModalProps {
  visible: boolean;
  selectedDayInfo: SelectedDayInfo | null;
  activeMacrocycle: Macrocycle | null;
  customizedDays: Set<number>;
  onClose: () => void;
  onStartWorkout: (routineId: number, routineName: string) => void;
  onCustomizeDay: (absoluteDay: number, dayInfo: any) => void;
  token: string | null;
}

export const DayModal: React.FC<DayModalProps> = ({
  visible,
  selectedDayInfo,
  activeMacrocycle,
  customizedDays,
  onClose,
  onStartWorkout,
  onCustomizeDay,
  token
}) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verificar si el día está completado cuando se abre el modal
  useEffect(() => {
    const checkCompleted = async () => {
      if (selectedDayInfo?.absoluteDay && activeMacrocycle && token && visible) {
        setLoading(true);
        const completed = await checkIfDayCompleted(
          activeMacrocycle.id,
          selectedDayInfo.absoluteDay,
          token
        );
        setIsCompleted(completed);
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    if (visible) {
      checkCompleted();
    }
  }, [selectedDayInfo?.absoluteDay, activeMacrocycle?.id, token, visible]);

  if (!selectedDayInfo) return null;

  const { date, dayPlan, dayOfCycle, absoluteDay, isInMacrocycle } = selectedDayInfo;
  const isToday = date.toDateString() === new Date().toDateString();
  const isPast = date < new Date() && !isToday;
  const isCustomized = absoluteDay ? customizedDays.has(absoluteDay) : false;

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusIcon = () => {
    if (isToday) return 'today';
    if (!isInMacrocycle) return 'calendar-outline';
    if (dayPlan?.isRestDay) return 'bed';
    return 'barbell';
  };

  const getStatusText = () => {
    if (isToday) return 'Hoy';
    if (!isInMacrocycle) return 'Fuera del macrociclo';
    if (dayPlan?.isRestDay) return 'Día de descanso';
    return 'Día de entrenamiento';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIcon}>
                  <Ionicons name={getStatusIcon()} size={24} color="white" />
                </View>
                <View>
                  <Text style={styles.modalDate}>
                    {formatFullDate(date)}
                  </Text>
                  <Text style={styles.modalStatus}>
                    {getStatusText()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {isInMacrocycle && dayPlan ? (
                <>
                  <View style={styles.infoSection}>
                    <View style={styles.infoItem}>
                      <View style={styles.infoIconContainer}>
                        <Ionicons name="layers-outline" size={18} color="#5E4B8B" />
                      </View>
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.infoLabel}>Día del microciclo</Text>
                        <Text style={styles.infoValue}>Día {dayOfCycle} de {activeMacrocycle?.microcycleDurationDays}</Text>
                      </View>
                    </View>

                    <View style={styles.infoItem}>
                      <View style={styles.infoIconContainer}>
                        <Ionicons name="calendar-clear-outline" size={18} color="#5E4B8B" />
                      </View>
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.infoLabel}>Macrociclo</Text>
                        <Text style={styles.infoValue}>{activeMacrocycle?.name}</Text>
                      </View>
                    </View>

                    {absoluteDay && (
                      <View style={styles.infoItem}>
                        <View style={styles.infoIconContainer}>
                          <Ionicons name="calendar-number-outline" size={18} color="#5E4B8B" />
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={styles.infoLabel}>Día absoluto</Text>
                          <Text style={styles.infoValue}>Día {absoluteDay} del macrociclo</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.activitySection}>
                    <Text style={styles.sectionTitle}>Actividad del día</Text>
                    <View style={styles.activityCard}>
                      <View style={styles.activityHeader}>
                        <View style={styles.activityIcon}>
                          <Ionicons 
                            name={dayPlan.isRestDay ? 'bed' : 'barbell'} 
                            size={20} 
                            color="white" 
                          />
                        </View>
                        <Text style={styles.activityTitle}>
                          {dayPlan.isRestDay ? 'Día de descanso' : 'Entrenamiento'}
                        </Text>
                      </View>
                      
                      {dayPlan.isRestDay ? (
                        <Text style={styles.activityDescription}>
                          Dedica este día a la recuperación. Tu cuerpo necesita tiempo para adaptarse y crecer más fuerte.
                        </Text>
                      ) : (
                        <View>
                          <Text style={styles.activityDescription}>
                            {dayPlan.routineName || 'Rutina no asignada'}
                          </Text>
                          {!dayPlan.routineName && (
                            <Text style={styles.noRoutineText}>
                              Este día tiene entrenamiento programado pero no hay rutina asignada.
                            </Text>
                          )}
                          {isCustomized && dayPlan.routineName && (
                            <View style={styles.customizationInfo}>
                              <Ionicons name="information-circle" size={14} color="#5E4B8B" />
                              <Text style={styles.customizationInfoText}>
                                Has personalizado algunos ejercicios para este día
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>

                  {!dayPlan.isRestDay && dayPlan.routineName && dayPlan.routineId && (
                    <View style={styles.actionsSection}>
                      <View style={styles.actionButtonsRow}>
                        {isToday && (
                          <TouchableOpacity
                            style={[
                              styles.startWorkoutButton,
                              isCompleted && styles.disabledWorkoutButton
                            ]}
                            onPress={() => {
                              if (isCompleted) {
                                Alert.alert(
                                  'Entrenamiento ya completado',
                                  'Ya has completado el entrenamiento de hoy.',
                                  [{ text: 'OK' }]
                                );
                                return;
                              }
                              onClose();
                              onStartWorkout(dayPlan.routineId!, dayPlan.routineName!);
                            }}
                            disabled={loading || isCompleted}
                            activeOpacity={isCompleted ? 1 : 0.8}
                          >
                            <Ionicons 
                              name={isCompleted ? "checkmark-circle" : "play"} 
                              size={18} 
                              color="white" 
                            />
                            <Text style={styles.startWorkoutButtonText}>
                              {loading ? "Verificando..." : 
                               isCompleted ? "Completado" : "Iniciar"}
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={[
                            styles.customizeButton,
                            !isToday && styles.customizeButtonFullWidth
                          ]}
                          onPress={() => {
                            onClose();
                            if (absoluteDay) {
                              onCustomizeDay(absoluteDay, dayPlan);
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="settings" size={18} color="#5E4B8B" />
                          <Text style={styles.customizeButtonText}>
                            Editar Rutina
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {!isToday && !isPast && (
                        <View style={styles.infoMessage}>
                          <Ionicons name="information-circle" size={16} color="#6B7280" />
                          <Text style={styles.infoMessageText}>
                            Solo puedes iniciar entrenamientos en el día actual
                          </Text>
                        </View>
                      )}

                      {isPast && (
                        <View style={styles.infoMessage}>
                          <Ionicons name="time" size={16} color="#6B7280" />
                          <Text style={styles.infoMessageText}>
                            Este día ya ha pasado
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyDaySection}>
                  <View style={styles.emptyDayIcon}>
                    <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
                  </View>
                  <Text style={styles.emptyDayTitle}>
                    Día libre
                  </Text>
                  <Text style={styles.emptyDayDescription}>
                    Este día no forma parte de tu macrociclo activo. Puedes usarlo para descanso adicional o actividades libres.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  // Estilos del botón de hoy
  todayWorkoutContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
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
  noWorkoutCard: {
    borderLeftColor: '#9CA3AF',
  },
  restDayCard: {
    borderLeftColor: '#5E4B8B',
  },
  noRoutineCard: {
    borderLeftColor: '#F59E0B',
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  workoutIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  noWorkoutIconContainer: {
    backgroundColor: '#F3F4F6',
  },
  restIconContainer: {
    backgroundColor: '#EDE9FE',
  },
  warningIconContainer: {
    backgroundColor: '#FEF3C7',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  workoutSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  customizationSubtitle: {
    fontSize: 12,
    color: '#5E4B8B',
    fontWeight: '600',
    marginTop: 2,
  },
  todayBadge: {
    backgroundColor: '#5E4B8B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeDayBadge: {
    backgroundColor: '#9CA3AF',
  },
  restBadge: {
    backgroundColor: '#5E4B8B',
  },
  warningBadge: {
    backgroundColor: '#F59E0B',
  },
  todayBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  freeDay: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  freeDayText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
  },

  restDayContent: {
    backgroundColor: '#EDE9FE',
    padding: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  restTips: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  restTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  restTipText: {
    fontSize: 12,
    color: '#5E4B8B',
    fontWeight: '600',
  },

  noRoutineContent: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  noRoutineText: {
    fontSize: 14,
    color: '#D97706',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  createRoutineButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5E4B8B',
    gap: 8,
  },
  createRoutineButtonText: {
    color: '#5E4B8B',
    fontWeight: '600',
    fontSize: 14,
  },

  workoutButtonsContainer: {
    gap: 12,
  },

  startWorkoutButton: {
    backgroundColor: '#5E4B8B',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  disabledWorkoutButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },

  customizeTodayButton: {
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  customizeTodayButtonText: {
    color: '#5E4B8B',
    fontSize: 14,
    fontWeight: '600',
  },

  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: width - 40,
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#5E4B8B',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  modalDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  modalStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5E4B8B',
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
    padding: 24,
    paddingTop: 16,
  },

  // Sección de información del modal
  infoSection: {
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },

  // Sección de actividad del modal
  activitySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#5E4B8B'
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#5E4B8B'
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  activityDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },

  customizationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#F3E8FF',
    padding: 8,
    borderRadius: 8,
  },
  customizationInfoText: {
    fontSize: 12,
    color: '#5E4B8B',
    fontWeight: '500',
    flex: 1,
  },

  // Botones de acción en modal
  actionsSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  startWorkoutButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  customizeButton: {
    flex: 1,
    backgroundColor: '#EDE9FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  customizeButtonFullWidth: {
    flex: 1,
  },
  customizeButtonText: {
    color: '#5E4B8B',
    fontWeight: '600',
    fontSize: 14,
  },

  // Mensajes informativos en modal
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoMessageText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
    fontStyle: 'italic',
  },

  // Día vacío en el modal
  emptyDaySection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyDayIcon: {
    marginBottom: 16,
  },
  emptyDayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyDayDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});