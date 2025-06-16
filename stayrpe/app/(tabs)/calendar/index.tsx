import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { 
  TodayWorkoutButton, 
  DayModal, 
  formatDate,
  getDayName,
  getMonthName,
  isCurrentMonth,
  getNavigationTitle,
  getDayInfo
} from '../../../components/CalendarComponents';

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

const SimpleCalendarScreen = () => {
  const [activeMacrocycle, setActiveMacrocycle] = useState<Macrocycle | null>(null);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date[][]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [showInfoCard, setShowInfoCard] = useState(true);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDayInfo, setSelectedDayInfo] = useState<SelectedDayInfo | null>(null);
  const [customizedDays, setCustomizedDays] = useState<Set<number>>(new Set());

  const router = useRouter();
  const API_URL = 'http://192.168.0.32:8080';

  const getInfoCardKey = (username: string) => `calendar_info_hidden_${username}`;

  const handleApiResponse = async (response: Response, successMessage: string = '') => {
    if (response.status === 401) {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("onboardingComplete");
      Alert.alert("Sesión Expirada", "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", [
        { text: "OK", onPress: () => router.replace("/") }
      ]);
      throw new Error('Token expired');
    }

    if (response.status === 400) {
      try {
        const errorData = await response.json();
        
        if (errorData.error && (errorData.error.includes('macrociclo') || errorData.error.includes('Macrociclo'))) {
          return null;
        }
      } catch (jsonError) {
        console.log('📋 No se pudo parsear error 400 como JSON');
      }
      
      throw new Error(`Bad Request (400): ${response.statusText}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  };

  const createApiHeaders = (token: string) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      setToken(storedToken);
    };
    getToken();
  }, []);

  useEffect(() => {
    const getCurrentUser = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/user/profile`, {
          headers: createApiHeaders(token)
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
        loadData();
      }
    }, [token])
  );

  useFocusEffect(
    React.useCallback(() => {
      if (token && activeMacrocycle) {
        Promise.all([
          loadDayPlans(activeMacrocycle.id),
          loadCustomizedDays(activeMacrocycle.id)
        ]).catch(error => {
          console.error(' Error recargando datos específicos:', error);
        });
      } else if (token && !activeMacrocycle && !loading) {
        setDayPlans([]);
        setCustomizedDays(new Set());
      }
    }, [token, activeMacrocycle, loading])
  );

  useEffect(() => {
    if (!loading && !activeMacrocycle) {
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

  const loadData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/macrocycles/active`, {
        headers: createApiHeaders(token)
      });

      const data = await handleApiResponse(response);
      
      if (data?.activeMacrocycle) {
        const activeMacro = data.activeMacrocycle;
        setActiveMacrocycle(activeMacro);
        
        try {
          const [dayPlansResult, customizedDaysResult] = await Promise.allSettled([
            loadDayPlans(activeMacro.id),
            loadCustomizedDays(activeMacro.id)
          ]);

          if (dayPlansResult.status === 'rejected') {
            console.error('❌ Error cargando day plans:', dayPlansResult.reason);
          }
          if (customizedDaysResult.status === 'rejected') {
            console.error('❌ Error cargando días customizados:', customizedDaysResult.reason);
          }

        } catch (dataError) {
          console.error('❌ Error cargando datos relacionados:', dataError);
          setDayPlans([]);
          setCustomizedDays(new Set());
        }
      } else {
        setActiveMacrocycle(null);
        setDayPlans([]);
        setCustomizedDays(new Set());
      }
    } catch (error) {
      console.error('❌ Error crítico cargando datos:', error);
      
      if (error.message === 'Token expired') {
        return;
      }
      
      setActiveMacrocycle(null);
      setDayPlans([]);
      setCustomizedDays(new Set());
    } finally {
      setLoading(false);
    }
  };

  const loadDayPlans = async (macrocycleId: number) => {
    if (!token || !macrocycleId) {
      setDayPlans([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/macrocycles/${macrocycleId}/day-plans`, {
        headers: createApiHeaders(token)
      });

      const data = await handleApiResponse(response);
      
      if (data) {
        setDayPlans(data);
      } else {
        setDayPlans([]);
      }
    } catch (error) {
      console.error('❌ Error cargando planes diarios:', error);
      setDayPlans([]);
    }
  };

  const loadCustomizedDays = async (macrocycleId: number) => {
    if (!token || !macrocycleId) {
      setCustomizedDays(new Set());
      return;
    }

    try {
      const response = await fetch(`${API_URL}/macrocycles/${macrocycleId}/customized-days`, {
        headers: createApiHeaders(token)
      });

      const data = await handleApiResponse(response);
      
      if (data) {
        const customizedDaysArray = data.customizedDays || [];
        setCustomizedDays(new Set(customizedDaysArray));
      } else {
        setCustomizedDays(new Set());
      }
    } catch (error) {
      console.error('❌ Error cargando días customizados:', error);
      setCustomizedDays(new Set());
    }
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

  const isDayCustomized = (date: Date) => {
    const dayInfo = getDayInfo(date, activeMacrocycle, dayPlans);
    if (!dayInfo || !dayInfo.absoluteDay) return false;
    
    return customizedDays.has(dayInfo.absoluteDay);
  };

  const checkIfAlreadyTrained = async (macrocycleId: number, absoluteDay: number) => {
    try {
      const response = await fetch(
        `${API_URL}/workout-history/check-day?macrocycleId=${macrocycleId}&absoluteDay=${absoluteDay}`,
        {
          headers: createApiHeaders(token!)
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.alreadyTrained;
      }
    } catch (error) {
      console.error('❌ Error verificando día de entrenamiento:', error);
    }
    return false;
  };

  const handleStartWorkout = async (routineId: number, routineName: string) => {
    try {
      const today = new Date();
      const dayInfo = getDayInfo(today, activeMacrocycle, dayPlans);
      
      if (dayInfo && dayInfo.absoluteDay && activeMacrocycle) {
        const alreadyTrained = await checkIfAlreadyTrained(activeMacrocycle.id, dayInfo.absoluteDay);
        
        if (alreadyTrained) {
          Alert.alert(
            'Ya entrenaste hoy',
            `Ya completaste el entrenamiento del día ${dayInfo.absoluteDay}. Solo se permite un entrenamiento por día en el macrociclo.`,
            [
              { text: 'Ver Historial', onPress: () => router.push('/(tabs)/profile/workout-history') },
              { text: 'OK', style: 'cancel' }
            ]
          );
          return;
        }
      }

      Alert.alert(
        'Iniciar Entrenamiento',
        `¿Quieres comenzar la rutina "${routineName}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Iniciar',
            onPress: () => {
              if (dayInfo && dayInfo.absoluteDay && activeMacrocycle && customizedDays.has(dayInfo.absoluteDay)) {
                router.push({
                  pathname: '/workout',
                  params: {
                    routineId: routineId.toString(),
                    routineName: routineName,
                    macrocycleId: activeMacrocycle.id.toString(),
                    absoluteDay: dayInfo.absoluteDay.toString()
                  }
                });
              } else {
                const params: any = {
                  routineId: routineId.toString(),
                  routineName: routineName
                };

                if (dayInfo && dayInfo.absoluteDay && activeMacrocycle) {
                  params.macrocycleId = activeMacrocycle.id.toString();
                  params.absoluteDay = dayInfo.absoluteDay.toString();
                }
                
                router.push({
                  pathname: '/workout',
                  params
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

      const alreadyTrained = await checkIfAlreadyTrained(activeMacrocycle.id, absoluteDay);
      
      if (alreadyTrained) {
        Alert.alert(
          'Día ya completado',
          `Ya completaste el entrenamiento del día ${absoluteDay}. No se puede personalizar un día que ya fue entrenado.`,
          [
            { text: 'Ver Historial', onPress: () => router.push('/(tabs)/profile/workout-history') },
            { text: 'OK', style: 'cancel' }
          ]
        );
        return;
      }
      
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
    const dayInfo = getDayInfo(date, activeMacrocycle, dayPlans);
    
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
        
        <Text style={styles.navigationTitle}>
          {getNavigationTitle(viewMode, currentWeek, monthOffset)}
        </Text>
        
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
          const dayInfo = getDayInfo(date, activeMacrocycle, dayPlans);
          const isToday = date.toDateString() === new Date().toDateString();
          const isCustomized = isDayCustomized(date);
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
                  {isCustomized ? (
                    <Ionicons name="settings" size={12} color="#5E4B8B" />
                  ) : (
                    <Ionicons 
                      name={dayInfo.isRestDay ? "bed" : "barbell"} 
                      size={12} 
                      color={dayInfo.isRestDay ? '#5E4B8B' : '#5E4B8B'} 
                    />
                  )}
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
        
        <Text style={styles.navigationTitle}>
          {getNavigationTitle(viewMode, currentWeek, monthOffset)}
        </Text>
        
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
              const dayInfo = getDayInfo(date, activeMacrocycle, dayPlans);
              const isToday = date.toDateString() === new Date().toDateString();
              const isThisMonth = isCurrentMonth(date, monthOffset);
              const isCustomized = isDayCustomized(date);
              
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
                      {isCustomized ? (
                        <View style={[styles.monthIndicatorDot, { backgroundColor: '#5E4B8B' }]} />
                      ) : (
                        <View style={[
                          styles.monthIndicatorDot,
                          { backgroundColor: dayInfo.isRestDay ? '#9CA3AF' : '#5E4B8B' }
                        ]} />
                      )}
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
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E4B8B" />
          <Text style={styles.loadingText}>Verificando macrociclo activo...</Text>
        </View>
      </View>
    );
  }

  if (!activeMacrocycle) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Mi Calendario</Text>
              <Text style={styles.headerSubtitle}>
                No hay macrociclo activo
              </Text>
            </View>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar" size={64} color="#5E4B8B" />
            </View>
            <Text style={styles.emptyTitle}>No hay macrociclo activo</Text>
            <Text style={styles.emptySubtitle}>
              Para ver tu calendario de entrenamientos, primero debes activar un macrociclo
            </Text>
            
            <View style={styles.emptyActions}>
              <TouchableOpacity 
                style={styles.primaryEmptyButton}
                onPress={() => router.push('/(tabs)/macrocycle')}
                activeOpacity={0.8}
              >
                <Ionicons name="layers" size={20} color="white" />
                <Text style={styles.primaryEmptyButtonText}>Ver Macrociclos</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryEmptyButton}
                onPress={() => router.push('/(tabs)/macrocycle/create')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#5E4B8B" />
                <Text style={styles.secondaryEmptyButtonText}>Crear Macrociclo</Text>
              </TouchableOpacity>
            </View>

            {showInfoCard && currentUsername && (
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <View style={styles.infoHeaderLeft}>
                    <Ionicons name="information-circle" size={20} color="#5E4B8B" />
                    <Text style={styles.infoCardTitle}>Información</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={hideInfoCard}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={18} color="#8B7AB8" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.infoCardText}>
                  Solo puede haber un macrociclo activo a la vez. Podrás editar de forma personalizada tus rutinas.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Mi Calendario</Text>
            <Text style={styles.headerSubtitle}>
              {activeMacrocycle.name} - Activo
            </Text>
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
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'week' ? renderWeekView() : renderMonthView()}

        <TodayWorkoutButton
          activeMacrocycle={activeMacrocycle}
          dayPlans={dayPlans}
          customizedDays={customizedDays}
          onStartWorkout={handleStartWorkout}
          onCustomizeDay={handleCustomizeDay}
          onNavigateToRoutines={() => router.push('/(tabs)/routines')}
          onNavigateToHistory={() => router.push('/(tabs)/profile/workout-history')}
          token={token}
        />

        <DayModal
          visible={showDayModal}
          selectedDayInfo={selectedDayInfo}
          activeMacrocycle={activeMacrocycle}
          customizedDays={customizedDays}
          onClose={() => setShowDayModal(false)}
          onStartWorkout={handleStartWorkout}
          onCustomizeDay={handleCustomizeDay}
          token={token}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D6CDE8',
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
    color: '#2D1B4E',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B5B95',
    fontWeight: '400',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  infoCardTitle: {
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
  infoCardText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    marginTop: 20,
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
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    marginHorizontal: 20,
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
  monthDaysHeader: {
    flexDirection: 'row',
    backgroundColor: '#5E4B8B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginHorizontal: 20,
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
    marginHorizontal: 20,
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
});

export default SimpleCalendarScreen;