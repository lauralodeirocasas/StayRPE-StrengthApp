import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
}

type ViewMode = 'week' | 'month';

const { width } = Dimensions.get('window');

const SimpleCalendarScreen = () => {
  const [activeMacrocycle, setActiveMacrocycle] = useState<Macrocycle | null>(null);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date[][]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  
  // Estados para el modal del día
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDayInfo, setSelectedDayInfo] = useState<SelectedDayInfo | null>(null);

  const router = useRouter();
  const API_URL = 'http://192.168.0.57:8080';

  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      setToken(storedToken);
    };
    getToken();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        loadData();
      }
    }, [token])
  );

  useEffect(() => {
    if (activeMacrocycle && dayPlans.length > 0) {
      if (viewMode === 'week') {
        generateWeek();
      } else {
        generateMonth();
      }
    }
  }, [weekOffset, monthOffset, viewMode, activeMacrocycle, dayPlans]);

  const loadData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/macrocycles/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.activeMacrocycle) {
          setActiveMacrocycle(data.activeMacrocycle);
          await loadDayPlans(data.activeMacrocycle.id);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDayPlans = async (macrocycleId: number) => {
    try {
      const response = await fetch(`${API_URL}/macrocycles/${macrocycleId}/day-plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const plans = await response.json();
        setDayPlans(plans);
      }
    } catch (error) {
      console.error('Error planes:', error);
    }
  };

  // Obtener información del día actual para mostrar el botón de rutina
  const getTodaysWorkout = () => {
    const today = new Date();
    const dayInfo = getDayInfo(today);
    
    if (!dayInfo || dayInfo.isRestDay || !dayInfo.routineId) {
      return null;
    }
    
    return {
      routineName: dayInfo.routineName,
      routineId: dayInfo.routineId,
      dayPlan: dayInfo
    };
  };

  const generateWeek = () => {
    const today = new Date();
    
    const startOfCurrentWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfCurrentWeek.setDate(today.getDate() - daysToMonday);
    
    startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + (weekOffset * 7));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfCurrentWeek);
      day.setDate(startOfCurrentWeek.getDate() + i);
      week.push(day);
    }
    setCurrentWeek(week);
  };

  const generateMonth = () => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - startOffset);
    
    const weeks = [];
    let currentDate = new Date(startDate);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        weekDays.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(weekDays);
      
      if (currentDate.getMonth() !== month && week >= 3) {
        break;
      }
    }
    
    setCurrentMonth(weeks);
  };

  const getDayInfo = (date: Date) => {
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

    return dayPlan;
  };

  // Función para iniciar rutina
  const handleStartWorkout = async (routineId: number, routineName: string) => {
    try {
      Alert.alert(
        'Iniciar Entrenamiento',
        `¿Quieres comenzar la rutina "${routineName}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Iniciar',
            onPress: () => {
              // Navegar a la pestaña de workout con la rutina
              router.push({
                pathname: '/(tabs)/calendar/workout',
                params: {
                  routineId: routineId.toString(),
                  routineName: routineName
                }
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error iniciando rutina:', error);
      Alert.alert('Error', 'No se pudo iniciar la rutina');
    }
  };

  const getDayColor = (date: Date) => {
    const dayInfo = getDayInfo(date);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const isPast = date < today && !isToday;

    if (!dayInfo) return '#F3F4F6';
    if (isPast) return '#9CA3AF';
    if (dayInfo.isRestDay) return '#10B981';
    return '#5E4B8B';
  };

  const canNavigatePrev = () => {
    if (!activeMacrocycle) return false;
    
    const startDate = new Date(activeMacrocycle.startDate + 'T00:00:00.000Z');
    const today = new Date();
    
    if (viewMode === 'week') {
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - daysToMonday + (weekOffset * 7));
      
      return currentWeekStart >= startDate || weekOffset > 0;
    } else {
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      return currentMonthStart >= startDate || monthOffset > 0;
    }
  };

  const canNavigateNext = () => {
    return true;
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && !canNavigatePrev()) return;
    if (direction === 'next' && !canNavigateNext()) return;
    
    const newOffset = weekOffset + (direction === 'next' ? 1 : -1);
    setWeekOffset(newOffset);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && !canNavigatePrev()) return;
    if (direction === 'next' && !canNavigateNext()) return;
    
    const newOffset = monthOffset + (direction === 'next' ? 1 : -1);
    setMonthOffset(newOffset);
  };

  const formatDate = (date: Date) => {
    return date.getDate().toString();
  };

  const getDayName = (date: Date) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  };

  const getMonthName = (date: Date) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[date.getMonth()];
  };

  const handleDayPress = (date: Date) => {
    const dayInfo = getDayInfo(date);
    
    let dayOfCycle: number | undefined;
    let isInMacrocycle = false;
    
    if (dayInfo && activeMacrocycle) {
      const startDate = new Date(activeMacrocycle.startDate + 'T00:00:00.000Z');
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const startDateNormalized = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const diffDays = Math.floor((checkDate.getTime() - startDateNormalized.getTime()) / (1000 * 60 * 60 * 24));
      dayOfCycle = (diffDays % activeMacrocycle.microcycleDurationDays) + 1;
      isInMacrocycle = true;
    }
    
    const selectedInfo: SelectedDayInfo = {
      date,
      dayPlan: dayInfo,
      dayOfCycle,
      isInMacrocycle
    };
    
    setSelectedDayInfo(selectedInfo);
    setShowDayModal(true);
  };

  const isCurrentMonth = (date: Date) => {
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return date.getMonth() === targetMonth.getMonth();
  };

  const getNavigationTitle = () => {
    if (viewMode === 'week' && currentWeek.length > 0) {
      return currentWeek[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'month') {
      const today = new Date();
      const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      return `${getMonthName(targetDate)} ${targetDate.getFullYear()}`;
    }
    return '';
  };

  // Componente del modal para información del día
  const renderDayModal = () => {
    if (!selectedDayInfo) return null;

    const { date, dayPlan, dayOfCycle, isInMacrocycle } = selectedDayInfo;
    const isToday = date.toDateString() === new Date().toDateString();
    const isPast = date < new Date() && !isToday;

    const formatFullDate = (date: Date) => {
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    };

    const getStatusColor = () => {
      if (isToday) return '#FF6B6B';
      if (!isInMacrocycle) return '#9CA3AF';
      if (dayPlan?.isRestDay) return '#10B981';
      return '#5E4B8B';
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
        visible={showDayModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View style={[styles.modalIcon, { backgroundColor: getStatusColor() }]}>
                    <Ionicons name={getStatusIcon()} size={24} color="white" />
                  </View>
                  <View>
                    <Text style={styles.modalDate}>
                      {formatFullDate(date)}
                    </Text>
                    <Text style={[styles.modalStatus, { color: getStatusColor() }]}>
                      {getStatusText()}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowDayModal(false)}
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
                    </View>

                    <View style={styles.activitySection}>
                      <Text style={styles.sectionTitle}>Actividad del día</Text>
                      <View style={[styles.activityCard, { borderLeftColor: getStatusColor() }]}>
                        <View style={styles.activityHeader}>
                          <View style={[styles.activityIcon, { backgroundColor: getStatusColor() }]}>
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
                          </View>
                        )}
                      </View>
                    </View>
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

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowDayModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>Cerrar</Text>
                </TouchableOpacity>
                
                {isInMacrocycle && dayPlan && !dayPlan.isRestDay && dayPlan.routineId && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryActionButton]}
                    onPress={() => {
                      setShowDayModal(false);
                      handleStartWorkout(dayPlan.routineId!, dayPlan.routineName || 'Rutina');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="play" size={16} color="white" />
                    <Text style={styles.primaryActionButtonText}>
                      {isToday ? 'Comenzar' : 'Ver rutina'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  };

  // Componente del botón de rutina del día
  const renderTodayWorkoutButton = () => {
    const todaysWorkout = getTodaysWorkout();
    
    if (!todaysWorkout) return null;

    return (
      <View style={styles.todayWorkoutContainer}>
        <View style={styles.workoutCard}>
          <View style={styles.workoutHeader}>
            <View style={styles.workoutIconContainer}>
              <Ionicons name="barbell" size={24} color="#5E4B8B" />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>Entrenamiento de hoy</Text>
              <Text style={styles.workoutSubtitle}>{todaysWorkout.routineName}</Text>
            </View>
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>HOY</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.startWorkoutButton}
            onPress={() => handleStartWorkout(todaysWorkout.routineId, todaysWorkout.routineName!)}
            activeOpacity={0.9}
          >
            <View style={styles.startButtonContent}>
              <Ionicons name="play-circle" size={24} color="white" />
              <Text style={styles.startButtonText}>Comenzar Entrenamiento</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderWeekView = () => (
    <>
      <View style={styles.navigation}>
        <TouchableOpacity 
          onPress={() => changeWeek('prev')} 
          style={[styles.navButton, !canNavigatePrev() && styles.navButtonDisabled]}
          disabled={!canNavigatePrev()}
        >
          <Ionicons 
            name="chevron-back" 
            size={24} 
            color={canNavigatePrev() ? "#5E4B8B" : "#D1D5DB"} 
          />
        </TouchableOpacity>
        
        <Text style={styles.navigationTitle}>{getNavigationTitle()}</Text>
        
        <TouchableOpacity 
          onPress={() => changeWeek('next')} 
          style={[styles.navButton, !canNavigateNext() && styles.navButtonDisabled]}
          disabled={!canNavigateNext()}
        >
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={canNavigateNext() ? "#5E4B8B" : "#D1D5DB"} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.weekContainer}>
        {currentWeek.map((date, index) => {
          const dayInfo = getDayInfo(date);
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <TouchableOpacity 
              key={index} 
              style={styles.dayContainer}
              onPress={() => handleDayPress(date)}
            >
              <Text style={[
                styles.dayName,
                isToday && styles.todayDayName
              ]}>
                {getDayName(date)}
              </Text>
              
              <View style={[
                styles.dayCircle,
                { backgroundColor: isToday ? '#FF6B6B' : getDayColor(date) },
                isToday && styles.todayCircle
              ]}>
                <Text style={[
                  styles.dayNumber,
                  { color: 'white' },
                  isToday && styles.todayDayNumber
                ]}>
                  {formatDate(date)}
                </Text>
              </View>
              
              {isToday && (
                <Text style={styles.todayLabel}>HOY</Text>
              )}
              
              {dayInfo && !isToday && (
                <View style={styles.dayTypeIndicator}>
                  <Ionicons 
                    name={dayInfo.isRestDay ? "bed" : "barbell"} 
                    size={12} 
                    color={getDayColor(date)} 
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const renderMonthView = () => (
    <>
      <View style={styles.navigation}>
        <TouchableOpacity 
          onPress={() => changeMonth('prev')} 
          style={[styles.navButton, !canNavigatePrev() && styles.navButtonDisabled]}
          disabled={!canNavigatePrev()}
        >
          <Ionicons 
            name="chevron-back" 
            size={24} 
            color={canNavigatePrev() ? "#5E4B8B" : "#D1D5DB"} 
          />
        </TouchableOpacity>
        
        <Text style={styles.navigationTitle}>{getNavigationTitle()}</Text>
        
        <TouchableOpacity 
          onPress={() => changeMonth('next')} 
          style={[styles.navButton, !canNavigateNext() && styles.navButtonDisabled]}
          disabled={!canNavigateNext()}
        >
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={canNavigateNext() ? "#5E4B8B" : "#D1D5DB"} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.monthDaysHeader}>
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
          <Text key={day} style={styles.monthDayHeaderText}>{day}</Text>
        ))}
      </View>

      <View style={styles.monthContainer}>
        {currentMonth.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.monthWeekRow}>
            {week.map((date, dayIndex) => {
              const dayInfo = getDayInfo(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isThisMonth = isCurrentMonth(date);
              
              return (
                <TouchableOpacity 
                  key={dayIndex} 
                  style={styles.monthDayContainer}
                  onPress={() => handleDayPress(date)}
                >
                  <View style={[
                    styles.monthDayCircle,
                    { backgroundColor: isToday ? '#FF6B6B' : getDayColor(date) },
                    isToday && styles.todayMonthCircle,
                    !isThisMonth && styles.otherMonthDay
                  ]}>
                    <Text style={[
                      styles.monthDayNumber,
                      { color: 'white' },
                      !isThisMonth && styles.otherMonthText,
                      isToday && styles.todayMonthNumber
                    ]}>
                      {formatDate(date)}
                    </Text>
                  </View>
                  
                  {isToday && (
                    <Text style={styles.todayMonthLabel}>HOY</Text>
                  )}
                  
                  {dayInfo && isThisMonth && !isToday && (
                    <View style={styles.monthDayIndicator}>
                      <View style={[
                        styles.monthIndicatorDot,
                        { backgroundColor: getDayColor(date) }
                      ]} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E4B8B" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (!activeMacrocycle) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={80} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No hay macrociclo activo</Text>
        <Text style={styles.emptySubtitle}>Activa un macrociclo para ver tu calendario</Text>
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={() => router.push('/(tabs)/macrociclo')}
        >
          <Text style={styles.emptyButtonText}>Ver Macrociclos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <Text style={styles.macrocycleName}>{activeMacrocycle.name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ACTIVO</Text>
          </View>
        </View>
        
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'week' && styles.toggleButtonActive]}
            onPress={() => setViewMode('week')}
          >
            <Ionicons 
              name="calendar" 
              size={16} 
              color={viewMode === 'week' ? 'white' : '#5E4B8B'} 
            />
            <Text style={[
              styles.toggleButtonText,
              viewMode === 'week' && styles.toggleButtonTextActive
            ]}>
              Semana
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'month' && styles.toggleButtonActive]}
            onPress={() => setViewMode('month')}
          >
            <Ionicons 
              name="grid" 
              size={16} 
              color={viewMode === 'month' ? 'white' : '#5E4B8B'} 
            />
            <Text style={[
              styles.toggleButtonText,
              viewMode === 'month' && styles.toggleButtonTextActive
            ]}>
              Mes
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Información del Macrociclo</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Inicio:</Text>
          <Text style={styles.infoValue}>
            {new Date(activeMacrocycle.startDate + 'T00:00:00.000Z').toLocaleDateString('es-ES')}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Duración:</Text>
          <Text style={styles.infoValue}>
            {activeMacrocycle.microcycleDurationDays} días por microciclo × {activeMacrocycle.totalMicrocycles} microciclos
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total:</Text>
          <Text style={styles.infoValue}>
            {activeMacrocycle.microcycleDurationDays * activeMacrocycle.totalMicrocycles} días
          </Text>
        </View>
      </View>

      {/* Botón de rutina del día */}
      {renderTodayWorkoutButton()}

      {viewMode === 'week' ? renderWeekView() : renderMonthView()}

      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Leyenda:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#5E4B8B' }]} />
            <Text style={styles.legendText}>Entrenamiento</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Descanso</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
            <Text style={styles.legendText}>Hoy</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F3F4F6' }]} />
            <Text style={styles.legendText}>Fuera del macrociclo</Text>
          </View>
        </View>
      </View>

      {renderDayModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyButton: {
    backgroundColor: '#5E4B8B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  headerCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  macrocycleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  badge: {
    backgroundColor: '#5E4B8B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  toggleButtonActive: {
    backgroundColor: '#5E4B8B',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E4B8B',
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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

  // Estilos para el botón de rutina del día
  todayWorkoutContainer: {
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
  todayBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  todayBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  navButton: {
    padding: 8,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navigationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  
  // Vista semanal
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  todayDayName: {
    color: '#FF6B6B',
    fontWeight: '700',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  todayCircle: {
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '600',
  },
  todayDayNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  todayLabel: {
    fontSize: 9,
    color: '#FF6B6B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dayTypeIndicator: {
    marginTop: 2,
  },

  // Vista mensual
  monthDaysHeader: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  monthDayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  monthContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  monthWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  monthDayContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  monthDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayMonthCircle: {
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  monthDayNumber: {
    fontSize: 13,
    fontWeight: '600',
  },
  todayMonthNumber: {
    fontSize: 14,
    fontWeight: '800',
  },
  todayMonthLabel: {
    fontSize: 7,
    color: '#FF6B6B',
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  monthDayIndicator: {
    marginTop: 2,
    height: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthText: {
    color: '#D1D5DB !important',
  },

  // Leyenda
  legendContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#6B7280',
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
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
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
  noRoutineText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 4,
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

  // Acciones del modal
  modalActions: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  primaryActionButton: {
    backgroundColor: '#5E4B8B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default SimpleCalendarScreen;