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

type ViewMode = 'week' | 'month';

const { width } = Dimensions.get('window');

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const SimpleCalendarScreen = () => {
  // ========== ESTADOS ==========
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

  // Estados para días customizados
  const [customizedDays, setCustomizedDays] = useState<Set<number>>(new Set());
  const [loadingCustomizedDays, setLoadingCustomizedDays] = useState(false);

  const router = useRouter();
  const API_URL = 'http://192.168.0.57:8080';

  // ========== EFFECTS ==========
  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      setToken(storedToken);
    };
    getToken();
  }, []);

  // Cargar datos cuando la pantalla recibe foco inicialmente
  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        console.log('📅 Verificando macrociclo activo...');
        loadData();
      }
    }, [token])
  );

  // Recargar datos específicos cuando regresamos de otras pantallas
  useFocusEffect(
    React.useCallback(() => {
      if (token && activeMacrocycle) {
        console.log('📱 Volviendo al calendario, recargando datos actualizados...');
        loadDayPlans(activeMacrocycle.id);
        loadCustomizedDays(activeMacrocycle.id);
      }
    }, [token, activeMacrocycle])
  );

  useEffect(() => {
    if (!loading && !activeMacrocycle) {
      console.log('❌ No hay macrociclo activo, limpiando datos...');
      setDayPlans([]);
      setCurrentWeek([]);
      setCurrentMonth([]);
      setShowDayModal(false);
      setSelectedDayInfo(null);
      setCustomizedDays(new Set());
    }
  }, [activeMacrocycle, loading]);

  useEffect(() => {
    if (activeMacrocycle && dayPlans.length > 0) {
      if (viewMode === 'week') {
        generateWeek();
      } else {
        generateMonth();
      }
    }
  }, [weekOffset, monthOffset, viewMode, activeMacrocycle, dayPlans]);

  // ========== FUNCIONES DE CARGA DE DATOS ==========
  const loadData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      console.log('🔄 Cargando datos del macrociclo activo...');
      
      const response = await fetch(`${API_URL}/macrocycles/active`, {
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
        console.log('📅 Respuesta del servidor:', data);
        
        if (data.activeMacrocycle) {
          console.log('✅ Macrociclo activo encontrado:', data.activeMacrocycle.name);
          setActiveMacrocycle(data.activeMacrocycle);
          await loadDayPlans(data.activeMacrocycle.id);
          await loadCustomizedDays(data.activeMacrocycle.id);
        } else {
          console.log('❌ No hay macrociclo activo');
          setActiveMacrocycle(null);
          setDayPlans([]);
          setCustomizedDays(new Set());
        }
      } else {
        console.error('❌ Error en la respuesta:', response.status);
        setActiveMacrocycle(null);
        setDayPlans([]);
        setCustomizedDays(new Set());
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      setActiveMacrocycle(null);
      setDayPlans([]);
      setCustomizedDays(new Set());
    } finally {
      setLoading(false);
    }
  };

  const loadDayPlans = async (macrocycleId: number) => {
    if (!token) return;

    try {
      console.log('📋 Cargando planes diarios para macrociclo:', macrocycleId);
      
      const response = await fetch(`${API_URL}/macrocycles/${macrocycleId}/day-plans`, {
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
        const plans = await response.json();
        console.log('📋 Planes diarios cargados:', plans.length);
        setDayPlans(plans);
      } else {
        console.error('❌ Error cargando planes diarios:', response.status);
        setDayPlans([]);
      }
    } catch (error) {
      console.error('❌ Error cargando planes diarios:', error);
      setDayPlans([]);
    }
  };

  const loadCustomizedDays = async (macrocycleId: number) => {
    if (!token) return;

    try {
      setLoadingCustomizedDays(true);
      console.log('🎨 Cargando días customizados para macrociclo:', macrocycleId);
      
      const response = await fetch(`${API_URL}/macrocycles/${macrocycleId}/customized-days`, {
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
        const customizedDaysArray = data.customizedDays || [];
        console.log('🎨 Días customizados cargados:', customizedDaysArray);
        setCustomizedDays(new Set(customizedDaysArray));
      } else {
        console.error('❌ Error cargando días customizados:', response.status);
        setCustomizedDays(new Set());
      }
    } catch (error) {
      console.error('❌ Error cargando días customizados:', error);
      setCustomizedDays(new Set());
    } finally {
      setLoadingCustomizedDays(false);
    }
  };

  // ========== FUNCIONES DE GENERACIÓN DE CALENDARIOS ==========
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

  // ========== FUNCIONES AUXILIARES ==========
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

    return {
      ...dayPlan,
      absoluteDay: diffDays + 1
    };
  };

  const isDayCustomized = (date: Date) => {
    const dayInfo = getDayInfo(date);
    if (!dayInfo || !dayInfo.absoluteDay) return false;
    
    return customizedDays.has(dayInfo.absoluteDay);
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

  // ========== FUNCIONES DE MANEJO DE EVENTOS ==========
  // CAMBIO EN index.tsx - Función handleStartWorkout actualizada

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
            // 🔥 NUEVO: Determinar si es una rutina customizada
            const today = new Date();
            const dayInfo = getDayInfo(today);
            
            if (dayInfo && dayInfo.absoluteDay && activeMacrocycle && customizedDays.has(dayInfo.absoluteDay)) {
              // 🔥 RUTINA CUSTOMIZADA: Pasar parámetros del macrociclo
              console.log('🎯 Iniciando rutina customizada:', {
                routineId,
                macrocycleId: activeMacrocycle.id,
                absoluteDay: dayInfo.absoluteDay
              });
              
              router.push({
                pathname: '/(tabs)/calendar/workout',
                params: {
                  routineId: routineId.toString(),
                  routineName: routineName,
                  // 🔥 PARÁMETROS ADICIONALES para rutinas customizadas
                  macrocycleId: activeMacrocycle.id.toString(),
                  absoluteDay: dayInfo.absoluteDay.toString()
                }
              });
            } else {
              // 🔥 RUTINA ORIGINAL: Solo parámetros básicos
              console.log('🎯 Iniciando rutina original:', { routineId });
              
              router.push({
                pathname: '/(tabs)/calendar/workout',
                params: {
                  routineId: routineId.toString(),
                  routineName: routineName
                }
              });
            }
          }
        }
      ]
    );
  } catch (error) {
    console.error('Error iniciando rutina:', error);
    Alert.alert('Error', 'No se pudo iniciar la rutina');
  }
};

  const handleCustomizeDay = async (absoluteDay: number, dayInfo: any) => {
    try {
      if (!activeMacrocycle) {
        Alert.alert('Error', 'No hay macrociclo activo');
        return;
      }

      console.log('🎨 Navegando a personalización del día', absoluteDay);
      
      router.push({
        pathname: '/(tabs)/calendar/customize-day',
        params: {
          macrocycleId: activeMacrocycle.id.toString(),
          absoluteDay: absoluteDay.toString(),
          routineName: dayInfo.routineName || 'Rutina',
        }
      });
    } catch (error) {
      console.error('Error navegando a personalización:', error);
      Alert.alert('Error', 'No se pudo abrir la personalización del día');
    }
  };

  const handleDayPress = (date: Date) => {
    const dayInfo = getDayInfo(date);
    
    let dayOfCycle: number | undefined;
    let isInMacrocycle = false;
    let absoluteDay: number | undefined;
    
    if (dayInfo && activeMacrocycle) {
      const startDate = new Date(activeMacrocycle.startDate + 'T00:00:00.000Z');
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const startDateNormalized = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const diffDays = Math.floor((checkDate.getTime() - startDateNormalized.getTime()) / (1000 * 60 * 60 * 24));
      dayOfCycle = (diffDays % activeMacrocycle.microcycleDurationDays) + 1;
      absoluteDay = diffDays + 1;
      isInMacrocycle = true;
    }
    
    const selectedInfo: SelectedDayInfo = {
      date,
      dayPlan: dayInfo,
      dayOfCycle,
      absoluteDay,
      isInMacrocycle
    };
    
    setSelectedDayInfo(selectedInfo);
    setShowDayModal(true);
  };

  // ========== FUNCIONES DE NAVEGACIÓN ==========
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

  // ========== FUNCIONES DE ESTILOS ==========
  const getWeekDayCircleStyles = (date: Date, dayInfo: any, isToday: boolean) => {
    const today = new Date();
    const isPast = date < today && !isToday;
    
    if (isToday) {
      return {
        backgroundColor: '#5E4B8B',
        borderWidth: 0,
        textColor: 'white',
        isPast: false,
        hasCircle: true
      };
    }
    
    if (dayInfo) {
      if (dayInfo.isRestDay) {
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
          textColor: isPast ? '#D1D5DB' : '#5E4B8B',
          isPast: isPast,
          hasCircle: false
        };
      } else {
        return {
          backgroundColor: isPast ? '#F8F9FA' : '#EDE9FE',
          borderWidth: 0,
          textColor: isPast ? '#D1D5DB' : '#5E4B8B',
          isPast: isPast,
          hasCircle: true
        };
      }
    }
    
    return {
      backgroundColor: 'transparent',
      borderWidth: 0,
      textColor: '#9CA3AF',
      isPast: false,
      hasCircle: false
    };
  };

  const getMonthDayCircleStyles = (date: Date, dayInfo: any, isToday: boolean) => {
    const today = new Date();
    const isPast = date < today && !isToday;
    
    if (isToday) {
      return {
        backgroundColor: '#5E4B8B',
        borderWidth: 0,
        textColor: 'white',
        isPast: false
      };
    }
    
    if (dayInfo) {
      if (dayInfo.isRestDay) {
        return {
          backgroundColor: isPast ? '#EDE9FE' : 'white',
          borderWidth: 2,
          textColor: isPast ? '#D1D5DB' : '#5E4B8B',
          isPast: isPast
        };
      } else {
        return {
          backgroundColor: isPast ? '#F8F9FA' : '#EDE9FE',
          borderWidth: 2,
          textColor: isPast ? '#D1D5DB' : '#5E4B8B',
          isPast: isPast
        };
      }
    }
    
    return {
      backgroundColor: '#F3F4F6',
      borderWidth: 0,
      textColor: 'white',
      isPast: false
    };
  };

  // ========== COMPONENTES DE RENDERIZADO ==========
  const renderTodayWorkoutButton = () => {
    const today = new Date();
    const dayInfo = getDayInfo(today);
    
    if (!activeMacrocycle) return null;

    const startDate = new Date(activeMacrocycle.startDate + 'T00:00:00.000Z');
    const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startDateNormalized = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const diffTime = checkDate.getTime() - startDateNormalized.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalDays = activeMacrocycle.microcycleDurationDays * activeMacrocycle.totalMicrocycles;
    
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
                onPress={() => router.push('/(tabs)/routines')}
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
              {isCustomized && (
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
              style={styles.startWorkoutButton}
              onPress={() => handleStartWorkout(dayInfo.routineId, dayInfo.routineName!)}
              activeOpacity={0.9}
            >
              <View style={styles.startButtonContent}>
                <Ionicons name="play-circle" size={24} color="white" />
                <Text style={styles.startButtonText}>Comenzar Entrenamiento</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.customizeTodayButton}
              onPress={() => {
                if (dayInfo.absoluteDay) {
                  handleCustomizeDay(dayInfo.absoluteDay, dayInfo);
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="settings" size={18} color="#5E4B8B" />
              <Text style={styles.customizeTodayButtonText}>
                Editar rutina
              </Text>
            </TouchableOpacity>
          </View>
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
          const circleStyles = getWeekDayCircleStyles(date, dayInfo, isToday);
          
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
              
              {circleStyles.hasCircle ? (
                <View style={[
                  styles.dayCircle,
                  { 
                    backgroundColor: circleStyles.backgroundColor,
                  },
                  isToday && styles.todayCircle
                ]}>
                  {circleStyles.isPast && (
                    <View style={[
                      styles.strikethroughLineWeek,
                      { 
                        backgroundColor: circleStyles.textColor,
                        opacity: 0.6
                      }
                    ]} />
                  )}
                  
                  <Text style={[
                    styles.dayNumber,
                    { color: circleStyles.textColor },
                    isToday && styles.todayDayNumber
                  ]}>
                    {formatDate(date)}
                  </Text>
                </View>
              ) : (
                <View style={styles.dayNumberContainer}>
                  <Text style={[
                    styles.dayNumberNoCircle,
                    { color: circleStyles.textColor },
                    circleStyles.isPast && styles.dayNumberPast
                  ]}>
                    {formatDate(date)}
                  </Text>
                </View>
              )}
              
              {isToday && (
                <Text style={styles.todayLabel}>HOY</Text>
              )}
              
              {dayInfo && !isToday && (
                <View style={styles.dayTypeIndicator}>
                  <Ionicons 
                    name={dayInfo.isRestDay ? "bed" : "barbell"} 
                    size={12} 
                    color={dayInfo.isRestDay ? '#5E4B8B' : '#5E4B8B'} 
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
                  {(dayInfo || isToday) && (
                    <View style={[
                      styles.monthDayCircle,
                      (() => {
                        const circleStyles = getMonthDayCircleStyles(date, dayInfo, isToday);
                        return {
                          backgroundColor: circleStyles.backgroundColor,
                        };
                      })(),
                      !isThisMonth && styles.otherMonthDay
                    ]}>
                      {(() => {
                        const circleStyles = getMonthDayCircleStyles(date, dayInfo, isToday);
                        return circleStyles.isPast && (
                          <View style={[
                            styles.strikethroughLine,
                            { 
                              backgroundColor: circleStyles.textColor,
                              opacity: 0.6
                            }
                          ]} />
                        );
                      })()}
                      
                      <Text style={[
                        styles.monthDayNumber,
                        (() => {
                          const circleStyles = getMonthDayCircleStyles(date, dayInfo, isToday);
                          return { color: circleStyles.textColor };
                        })(),
                        !isThisMonth && styles.otherMonthText,
                        isToday && styles.todayMonthNumber
                      ]}>
                        {formatDate(date)}
                      </Text>
                    </View>
                  )}
                  
                  {!dayInfo && !isToday && (
                    <Text style={[
                      styles.monthDayNumberNoCircle,
                      !isThisMonth && styles.otherMonthTextNoCircle
                    ]}>
                      {formatDate(date)}
                    </Text>
                  )}
                  
                  {isToday && (
                    <Text style={styles.todayMonthLabel}>HOY</Text>
                  )}
                  
                  {dayInfo && isThisMonth && !isToday && (
                    <View style={styles.monthDayIndicator}>
                      <View style={[
                        styles.monthIndicatorDot,
                        { backgroundColor: dayInfo.isRestDay ? '#9CA3AF' : '#5E4B8B' }
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

  const renderDayModal = () => {
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
                              style={styles.startWorkoutButton}
                              onPress={() => {
                                setShowDayModal(false);
                                handleStartWorkout(dayPlan.routineId!, dayPlan.routineName!);
                              }}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="play" size={18} color="white" />
                              <Text style={styles.startWorkoutButtonText}>Iniciar</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={[
                              styles.customizeButton,
                              !isToday && styles.customizeButtonFullWidth
                            ]}
                            onPress={() => {
                              setShowDayModal(false);
                              if (absoluteDay) {
                                handleCustomizeDay(absoluteDay, dayPlan);
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

  // ========== RENDERIZADO PRINCIPAL ==========
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E4B8B" />
        <Text style={styles.loadingText}>Verificando macrociclo activo...</Text>
      </View>
    );
  }

  if (!activeMacrocycle) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="calendar-outline" size={80} color="#D1D5DB" />
        </View>
        <Text style={styles.emptyTitle}>No hay macrociclo activo</Text>
        <Text style={styles.emptySubtitle}>
          Para ver tu calendario de entrenamientos, primero debes activar un macrociclo
        </Text>
        
        <View style={styles.emptyActions}>
          <TouchableOpacity 
            style={styles.primaryEmptyButton}
            onPress={() => router.push('/(tabs)/macrociclo')}
            activeOpacity={0.8}
          >
            <Ionicons name="layers" size={20} color="white" />
            <Text style={styles.primaryEmptyButtonText}>Ver Macrociclos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryEmptyButton}
            onPress={() => router.push('/(tabs)/macrociclo/create')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#5E4B8B" />
            <Text style={styles.secondaryEmptyButtonText}>Crear Macrociclo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#5E4B8B" />
            <Text style={styles.infoCardTitle}>¿Qué es un macrociclo?</Text>
          </View>
          <Text style={styles.infoCardText}>
            Un macrociclo es tu plan de entrenamiento a largo plazo que organiza tus rutinas y días de descanso durante varias semanas.
          </Text>
        </View>
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

      {viewMode === 'week' ? renderWeekView() : renderMonthView()}

      {renderTodayWorkoutButton()}

      {renderDayModal()}
    </ScrollView>
  );
};

// ============================================================================
// ESTILOS
// ============================================================================

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
    backgroundColor: '#FAFAFA',
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
    backgroundColor: '#FAFAFA',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  primaryEmptyButton: {
    backgroundColor: '#5E4B8B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryEmptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryEmptyButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#5E4B8B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  secondaryEmptyButtonText: {
    color: '#5E4B8B',
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
    flexWrap: 'wrap',
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
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5E4B8B',
  },
  infoCardText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Estilos del botón de hoy
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
    color: '#5E4B8B',
    fontWeight: '700',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  
  strikethroughLineWeek: {
    position: 'absolute',
    top: '50%',
    left: 4,
    right: 4,
    height: 2,
    transform: [{ translateY: -1 }],
    zIndex: 1,
  },
  
  dayNumberContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  dayNumberNoCircle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  dayNumberPast: {
    opacity: 0.6,
  },
  
  todayCircle: {
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
    color: '#5E4B8B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dayTypeIndicator: {
    marginTop: 2,
  },

  // Vista mensual
  monthDaysHeader: {
    flexDirection: 'row',
    backgroundColor: '#5E4B8B',
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
    color: '#fff',
  },
  monthContainer: {
    backgroundColor: '#fff',
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
    position: 'relative',
  },
  monthDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  
  strikethroughLine: {
    position: 'absolute',
    top: '50%',
    left: 2,
    right: 2,
    height: 1.5,
    transform: [{ translateY: -0.75 }],
    zIndex: 1,
  },
  todayMonthCircle: {
    shadowColor: '#5E4B8B',
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
  
  monthDayNumberNoCircle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 8,
    minHeight: 32,
    lineHeight: 16,
  },
  otherMonthTextNoCircle: {
    color: '#D1D5DB',
    opacity: 0.5,
  },
  
  todayMonthLabel: {
    fontSize: 7,
    color: '#5E4B8B',
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

export default SimpleCalendarScreen;