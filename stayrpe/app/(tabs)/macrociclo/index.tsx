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
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Macrocycle {
  id: number;
  name: string;
  description: string;
  startDate: string;
  microcycleDurationDays: number;
  totalMicrocycles: number;
  createdAt: string;
  isArchived: boolean;
  isCurrentlyActive: boolean;
}

interface DayPlan {
  dayNumber: number;
  isRestDay: boolean;
  routineId: number | null;
  routineName: string | null;
}

// Componente para iconos animados
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

const MacrocyclesScreen = () => {
  const [macrocycles, setMacrocycles] = useState<Macrocycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [dayPlans, setDayPlans] = useState<Record<number, DayPlan[]>>({});
  const [loadingDayPlans, setLoadingDayPlans] = useState<Set<number>>(new Set());
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

  // Cargar macrociclos cuando se obtiene el token o cuando se enfoca la pantalla
  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        loadMacrocycles();
      }
    }, [token])
  );

  const loadMacrocycles = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/macrocycles`, {
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
        console.log('📋 Macrociclos recibidos:', data);
        
        const processedData = data.map((macrocycle: any) => ({
          ...macrocycle,
          isCurrentlyActive: macrocycle.currentlyActive ?? false,
          isArchived: macrocycle.archived ?? false
        }));
        
        console.log('📋 Macrociclos procesados:', processedData);
        setMacrocycles(processedData);
      } else {
        console.error('Error cargando macrociclos:', response.status);
        Alert.alert('Error', 'No se pudieron cargar los macrociclos');
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const loadDayPlans = async (macrocycleId: number) => {
    if (!token || dayPlans[macrocycleId]) return;

    try {
      setLoadingDayPlans(prev => new Set(prev).add(macrocycleId));
      
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
        const data = await response.json();
        setDayPlans(prev => ({
          ...prev,
          [macrocycleId]: data
        }));
      } else {
        console.error('Error cargando planes diarios:', response.status);
      }
    } catch (error) {
      console.error('Error de conexión al cargar planes diarios:', error);
    } finally {
      setLoadingDayPlans(prev => {
        const newSet = new Set(prev);
        newSet.delete(macrocycleId);
        return newSet;
      });
    }
  };

  // 🔥 FUNCIÓN MEJORADA: Verificar customizaciones antes de desactivar
  const toggleMacrocycleActivation = async (macrocycle: Macrocycle) => {
    if (!token) return;

    // 🚨 NUEVA VALIDACIÓN: No permitir activar si ya hay otro activo
    if (!macrocycle.isCurrentlyActive) {
      const activeMacrocycle = macrocycles.find(m => m.isCurrentlyActive);
      
      if (activeMacrocycle) {
        Alert.alert(
          'Macrociclo ya activo',
          `Ya tienes el macrociclo "${activeMacrocycle.name}" activo.\n\nPara activar "${macrocycle.name}", primero debes desactivar el macrociclo actual.`,
          [
            {
              text: 'Entendido',
              style: 'cancel',
            },
            
          ]
        );
        return;
      }
    }

    const actionText = macrocycle.isCurrentlyActive ? 'desactivar' : 'activar';
    const alertTitle = macrocycle.isCurrentlyActive ? 'Desactivar Macrociclo' : 'Activar Macrociclo';
    
    // 🔥 NUEVO: Para desactivación, verificar primero si hay customizaciones
    if (macrocycle.isCurrentlyActive) {
      try {
        // Verificar si hay días customizados antes de mostrar la alerta
        const customizationsResponse = await fetch(`${API_URL}/macrocycles/${macrocycle.id}/customized-days`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (customizationsResponse.ok) {
          const customizationsData = await customizationsResponse.json();
          const hasCustomizations = customizationsData.totalCustomizations > 0;
          
          // 🔥 MENSAJE PERSONALIZADO según si hay customizaciones o no
          let alertMessage = `¿Estás seguro de que quieres desactivar "${macrocycle.name}"? Perderas todos los cambios realizados.`;
          
          

          // 🔥 ALERTA MEJORADA con estilo destructivo
          Alert.alert(
            alertTitle,
            alertMessage,
            [
              {
                text: 'Cancelar',
                style: 'cancel',
              },
              {
                text: "Sí, desactivar macrociclo",
                style: 'destructive', // 🔥 Estilo destructivo para advertir mejor
                onPress: async () => {
                  await performDeactivation(macrocycle, hasCustomizations);
                },
              },
            ],
            { cancelable: true }
          );
          
        } else {
          // Si no se puede verificar customizaciones, usar mensaje genérico
          showGenericDeactivationAlert(macrocycle);
        }
        
      } catch (error) {
        console.error('Error verificando customizaciones:', error);
        // En caso de error, usar mensaje genérico
        showGenericDeactivationAlert(macrocycle);
      }
      
    } else {
      // Para activación, mensaje simple
      const alertMessage = `¿Estás seguro de que quieres activar "${macrocycle.name}"?`;
      
      Alert.alert(
        alertTitle,
        alertMessage,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Activar',
            onPress: async () => {
              await performActivation(macrocycle);
            },
          },
        ]
      );
    }
  };

  // 🔥 FUNCIÓN AUXILIAR: Alerta genérica de desactivación (fallback)
  const showGenericDeactivationAlert = (macrocycle: Macrocycle) => {
    Alert.alert(
      'Desactivar Macrociclo',
      `⚠️ Al desactivar "${macrocycle.name}" se eliminarán todas las personalizaciones que hayas hecho en días específicos.\n\nEsta acción no se puede deshacer.\n\n¿Estás seguro de que quieres continuar?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sí, desactivar',
          style: 'destructive',
          onPress: async () => {
            await performDeactivation(macrocycle, false);
          },
        },
      ],
      { cancelable: true }
    );
  };

  // 🔥 FUNCIÓN AUXILIAR: Ejecutar desactivación
  const performDeactivation = async (macrocycle: Macrocycle, hadCustomizations: boolean) => {
    try {
      setActivatingId(macrocycle.id);
      
      const response = await fetch(`${API_URL}/macrocycles/deactivate`, {
        method: 'PUT',
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

      const data = await response.json();

      if (response.ok) {
        await loadMacrocycles();
        
        // 🔥 MENSAJE DE CONFIRMACIÓN MEJORADO
        let successMessage = data.message || 'Macrociclo desactivado correctamente.';
        
        
        Alert.alert('Desactivado', successMessage);
      } else {
        Alert.alert('Error', data.error || 'Error al desactivar macrociclo');
      }
    } catch (error) {
      console.error('Error desactivando macrociclo:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setActivatingId(null);
    }
  };

  // 🔥 FUNCIÓN AUXILIAR: Ejecutar activación
  const performActivation = async (macrocycle: Macrocycle) => {
    try {
      setActivatingId(macrocycle.id);
      
      const response = await fetch(`${API_URL}/macrocycles/${macrocycle.id}/activate`, {
        method: 'PUT',
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

      const data = await response.json();

      if (response.ok) {
        await loadMacrocycles();
        Alert.alert('Éxito', data.message);
      } else {
        Alert.alert('Error', data.error || 'Error al activar macrociclo');
      }
    } catch (error) {
      console.error('Error activando macrociclo:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setActivatingId(null);
    }
  };

  const archiveMacrocycle = async (macrocycle: Macrocycle) => {
    if (!token) return;

    Alert.alert(
      'Archivar Macrociclo',
      `¿Estás seguro de que quieres archivar "${macrocycle.name}"? Podrás recuperarlo más tarde si lo necesitas.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Archivar',
          onPress: async () => {
            try {
              setArchivingId(macrocycle.id);
              
              const response = await fetch(`${API_URL}/macrocycles/${macrocycle.id}/archive`, {
                method: 'PUT',
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

              const data = await response.json();

              if (response.ok) {
                setMacrocycles(prev => prev.filter(m => m.id !== macrocycle.id));
                setExpandedItems(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(macrocycle.id);
                  return newSet;
                });
                setDayPlans(prev => {
                  const { [macrocycle.id]: removed, ...rest } = prev;
                  return rest;
                });
                Alert.alert('Archivado', data.message || 'Macrociclo archivado correctamente');
              } else {
                Alert.alert('Error', data.error || 'Error al archivar macrociclo');
              }
            } catch (error) {
              console.error('Error archivando macrociclo:', error);
              Alert.alert('Error', 'No se pudo conectar con el servidor');
            } finally {
              setArchivingId(null);
            }
          },
        },
      ]
    );
  };

  const toggleExpanded = async (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    const isCurrentlyExpanded = expandedItems.has(id);
    
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });

    if (!isCurrentlyExpanded && !dayPlans[id]) {
      await loadDayPlans(id);
    }
  };

  const deleteMacrocycle = async (id: number, name: string) => {
    if (!token) return;

    Alert.alert(
      'Eliminar Macrociclo',
      `¿Estás seguro de que quieres eliminar "${name}"? Esta acción no se puede deshacer.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(id);
              
              const response = await fetch(`${API_URL}/macrocycles/${id}`, {
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

              const data = await response.json();

              if (response.ok) {
                setMacrocycles(prev => prev.filter(m => m.id !== id));
                setExpandedItems(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(id);
                  return newSet;
                });
                setDayPlans(prev => {
                  const { [id]: removed, ...rest } = prev;
                  return rest;
                });
                Alert.alert('Eliminado', data.message || 'Macrociclo eliminado correctamente');
              } else {
                Alert.alert('Error', data.error || 'Error al eliminar macrociclo');
              }
            } catch (error) {
              console.error('Error eliminando macrociclo:', error);
              Alert.alert('Error', 'No se pudo conectar con el servidor');
            } finally {
              setDeletingId(null);
            }
          },
        },
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

  const calculateEndDate = (startDate: string, microcycleDays: number, totalMicrocycles: number) => {
    try {
      const start = new Date(startDate);
      const totalDays = microcycleDays * totalMicrocycles;
      const endDate = new Date(start);
      endDate.setDate(start.getDate() + totalDays - 1);
      return endDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getDayName = (dayNumber: number) => {
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return dayNames[(dayNumber - 1) % 7];
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Mis Macrociclos</Text>
            <Text style={styles.headerSubtitle}>
              {macrocycles.length}/3 macrociclos activos
            </Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.createButton,
              macrocycles.length >= 3 && styles.createButtonDisabled
            ]}
            onPress={() => router.push('/(tabs)/macrociclo/create')}
            disabled={macrocycles.length >= 3}
            activeOpacity={0.85}
          >
            <View style={styles.createButtonIconContainer}>
              <Ionicons name="add" size={20} color="white" />
            </View>
            <Text style={styles.createButtonText}>Nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de macrociclos */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5E4B8B" />
            <Text style={styles.loadingText}>Cargando macrociclos...</Text>
          </View>
        ) : macrocycles.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar" size={64} color="#5E4B8B" />
            </View>
            <Text style={styles.emptyTitle}>¡Organiza tu entrenamiento!</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primer macrociclo para planificar tus entrenamientos
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/macrociclo/create')}
              activeOpacity={0.85}
            >
              <View style={styles.emptyButtonIconContainer}>
                <Ionicons name="add-circle" size={20} color="white" />
              </View>
              <Text style={styles.emptyButtonText}>Crear Primer Macrociclo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.macrocyclesList}>
            {macrocycles.map((macrocycle) => {
              const isExpanded = expandedItems.has(macrocycle.id);
              const macrocycleDayPlans = dayPlans[macrocycle.id] || [];
              const isLoadingPlans = loadingDayPlans.has(macrocycle.id);

              return (
                <View key={macrocycle.id} style={[
                  styles.macrocycleCard,
                  macrocycle.isCurrentlyActive && styles.activeMacrocycleCard
                ]}>
                  {/* Header Principal */}
                  <View style={styles.macrocycleHeader}>
                    <View style={styles.macrocycleInfo}>
                      {/* Nombre y badge en la misma línea */}
                      <View style={styles.nameRow}>
                        <Text style={styles.macrocycleName}>{macrocycle.name}</Text>
                        {macrocycle.isCurrentlyActive && (
                          <View style={styles.activeBadge}>
                            <View style={styles.activeBadgeIconContainer}>
                              <Ionicons name="radio-button-on" size={12} color="white" />
                            </View>
                            <Text style={styles.activeBadgeText}>ACTIVO</Text>
                          </View>
                        )}
                      </View>
                      
                      {macrocycle.description && (
                        <Text style={styles.macrocycleDescription}>{macrocycle.description}</Text>
                      )}
                      
                      {/* Información del macrociclo */}
                      <View style={styles.infoRow}>
                          <View style={styles.infoIconContainer}>
                            <Ionicons name="calendar-outline" size={14} color="#5E4B8B" />
                            <Text style={styles.infoText}>
                            {formatDate(macrocycle.startDate)} - {calculateEndDate(macrocycle.startDate, macrocycle.microcycleDurationDays, macrocycle.totalMicrocycles)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                          <View style={styles.infoIconContainer}>
                            <Ionicons name="time-outline" size={14} color="#5E4B8B" />
                            <Text style={styles.infoText}>
                            {macrocycle.microcycleDurationDays * macrocycle.totalMicrocycles} días total
                          </Text>
                        </View>
                          <View style={styles.infoIconContainer}>
                            <Ionicons name="layers-outline" size={14} color="#5E4B8B" />
                            <Text style={styles.infoText}>
                            {macrocycle.totalMicrocycles} microciclos
                          </Text>  
                        </View>
                      </View>

                      <Text style={styles.macrocycleDate}>
                        Creado el {formatDate(macrocycle.createdAt)}
                      </Text>
                    </View>

                    {/* Botones de acción verticales */}
                    <View style={styles.actionsContainer}>
                      {/* Botón de activar/desactivar */}
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          macrocycle.isCurrentlyActive ? styles.deactivateButton : styles.activateButton
                        ]}
                        onPress={() => toggleMacrocycleActivation(macrocycle)}
                        disabled={activatingId === macrocycle.id}
                        activeOpacity={0.85}
                      >
                        {activatingId === macrocycle.id ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Ionicons 
                            name={macrocycle.isCurrentlyActive ? "pause" : "play"} 
                            size={18} 
                            color="white"
                          />
                        )}
                      </TouchableOpacity>

                      {/* Botón de archivar */}
                      <TouchableOpacity
                        style={[styles.actionButton, styles.archiveButton]}
                        onPress={() => archiveMacrocycle(macrocycle)}
                        disabled={archivingId === macrocycle.id}
                        activeOpacity={0.85}
                      >
                        {archivingId === macrocycle.id ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Ionicons name="archive" size={18} color="white" />
                        )}
                      </TouchableOpacity>

                      {/* Botón de eliminar */}
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => deleteMacrocycle(macrocycle.id, macrocycle.name)}
                        disabled={deletingId === macrocycle.id}
                        activeOpacity={0.85}
                      >
                        {deletingId === macrocycle.id ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Ionicons name="trash" size={18} color="white" />
                        )}
                      </TouchableOpacity>

                      {/* Botón de expandir con animación */}
                      <TouchableOpacity
                        style={[styles.actionButton, styles.expandButton]}
                        onPress={() => toggleExpanded(macrocycle.id)}
                        activeOpacity={0.85}
                      >
                        <AnimatedIcon 
                          name="chevron-down" 
                          size={18} 
                          color="white"
                          isRotated={isExpanded}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Contenido Desplegable */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={styles.planningHeader}>
                        <View style={styles.planningTitleRow}>
                          <View style={styles.planningIconContainer}>
                            <AntDesign name="barschart" size={18} color="#5E4B8B" />
                          </View>
                          <Text style={styles.planningTitle}>Detalles</Text>
                        </View>
                        <Text style={styles.planningSubtitle}>
                          Rutinas asignadas para cada día ({macrocycle.microcycleDurationDays} días)
                        </Text>
                      </View>

                      {isLoadingPlans ? (
                        <View style={styles.planningLoading}>
                          <ActivityIndicator size="small" color="#5E4B8B" />
                          <Text style={styles.planningLoadingText}>Cargando planificación...</Text>
                        </View>
                      ) : macrocycleDayPlans.length === 0 ? (
                        <View style={styles.noPlanningContainer}>
                          <View style={styles.noPlanningIconContainer}>
                            <Ionicons name="calendar-outline" size={24} color="#8B7AB8" />
                          </View>
                          <Text style={styles.noPlanningText}>
                            Este macrociclo no tiene planificación diaria
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.dayPlansList}>
                          {macrocycleDayPlans.map((dayPlan) => (
                            <View key={dayPlan.dayNumber} style={styles.dayPlanItem}>
                              <View style={styles.dayInfo}>
                                <Text style={styles.dayNumberText}>Día {dayPlan.dayNumber}</Text>
                                <Text style={styles.dayNameText}>{getDayName(dayPlan.dayNumber)}</Text>
                              </View>
                              
                              <View style={styles.dayContent}>
                                {dayPlan.isRestDay ? (
                                  <View style={styles.restDayContainer}>
                                    <View style={styles.restDayIconContainer}>
                                      <Ionicons name="bed" size={16} color="#5E4B8B" />
                                    </View>
                                    <Text style={styles.restDayText}>Descanso</Text>
                                  </View>
                                ) : (
                                  <View style={styles.routineContainer}>
                                    <View style={styles.routineIconContainer}>
                                      <Ionicons name="barbell" size={16} color="#5E4B8B" />
                                    </View>
                                    <Text style={styles.routineText} numberOfLines={1}>
                                      {dayPlan.routineName || 'Rutina eliminada'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          ))}
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
    marginBottom:60
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8B7AB8',
    fontWeight: '500',
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
  createButtonDisabled: {
    backgroundColor: '#B3A5CD',
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#2D1B4E',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B5B95',
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
  emptyButtonIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 17,
  },
  macrocyclesList: {
    gap: 16,
  },
  macrocycleCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
   
  },
  activeMacrocycleCard: {
    borderWidth: 2,
    borderColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  macrocycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 10,
  },
  macrocycleInfo: {
    flex: 1,
    marginRight: 16,
  },
  macrocycleName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1B4E',
    flex: 1,
  },
  macrocycleDescription: {
    fontSize: 15,
    color: '#6B5B95',
    marginBottom: 12,
    lineHeight: 20,
  },
  activeBadge: {
    backgroundColor: '#5E4B8B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
    marginLeft: 8,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeBadgeIconContainer: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap:8
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  infoIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    
  },
  macrocycleDate: {
    fontSize: 13,
    color: '#8B7AB8',
    fontWeight: '400',
    marginTop: 8,
  },
  
  // === BOTONES DE ACCIÓN CON TONALIDAD #5E4B8B ===
  actionsContainer: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  activateButton: {
    backgroundColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOpacity: 0.25,
  },
  deactivateButton: {
    backgroundColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOpacity: 0.25,
  },
  archiveButton: {
    backgroundColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOpacity: 0.25,
  },
  deleteButton: {
    backgroundColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOpacity: 0.3,
  },
  expandButton: {
    backgroundColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOpacity: 0.2,
  },

  // === CONTENIDO EXPANDIDO ===
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#D6CDE8',
    backgroundColor: '#fff',
    
  },
  planningHeader: {
    marginBottom: 16,
    paddingTop: 16,
  },
  planningTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planningIconContainer: {
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
  planningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1B4E',
  },
  planningSubtitle: {
    fontSize: 14,
    color: '#6B5B95',
    fontWeight: '500',
  },
  planningLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  planningLoadingText: {
    fontSize: 14,
    color: '#6B5B95',
    fontWeight: '500',
  },
  noPlanningContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noPlanningIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F7FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  noPlanningText: {
    fontSize: 14,
    color: '#8B7AB8',
    textAlign: 'center',
    fontWeight: '500',
  },
  dayPlansList: {
    gap: 8,
  },
  dayPlanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D6CDE8',
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  dayInfo: {
    width: 80,
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D1B4E',
  },
  dayNameText: {
    fontSize: 12,
    color: '#6B5B95',
    fontWeight: '500',
  },
  dayContent: {
    flex: 1,
  },
  restDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  restDayIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFEDFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restDayText: {
    fontSize: 13,
    color: '#6B5B95',
    fontWeight: '600',
  },
  routineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  routineIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFEDFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routineText: {
    fontSize: 13,
    color: '#5E4B8B',
    fontWeight: '600',
    flex: 1,
  },
  
  // === WARNING BANNER ===
  warningBanner: {
    backgroundColor: '#FBF9FE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D6CDE8',
    marginTop:10,
    margin:30
  },
  warningIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(94, 75, 139, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#5E4B8B',
    fontWeight: '500',
  },
});

export default MacrocyclesScreen;