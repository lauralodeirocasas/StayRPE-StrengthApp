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
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Macrocycle {
  id: number;
  name: string;
  description: string;
  startDate: string;
  microcycleDurationDays: number;
  totalMicrocycles: number;
  createdAt: string;
  isActive: boolean;
}

const MacrocyclesScreen = () => {
  const [macrocycles, setMacrocycles] = useState<Macrocycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

      // Verificación token expirado
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
        setMacrocycles(data);
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

              // Verificación token expirado
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
                // Eliminar de la lista local sin recargar
                setMacrocycles(prev => prev.filter(m => m.id !== id));
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
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="white" />
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
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.emptyButtonText}>Crear Primer Macrociclo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.macrocyclesList}>
            {macrocycles.map((macrocycle) => (
              <View key={macrocycle.id} style={styles.macrocycleCard}>
                <View style={styles.macrocycleHeader}>
                  <View style={styles.macrocycleInfo}>
                    <Text style={styles.macrocycleName}>{macrocycle.name}</Text>
                    {macrocycle.description && (
                      <Text style={styles.macrocycleDescription}>{macrocycle.description}</Text>
                    )}
                    
                    {/* Información del macrociclo */}
                    <View style={styles.infoRow}>
                      <View style={styles.infoItem}>
                        <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                        <Text style={styles.infoText}>
                          {formatDate(macrocycle.startDate)} - {calculateEndDate(macrocycle.startDate, macrocycle.microcycleDurationDays, macrocycle.totalMicrocycles)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoRow}>
                      <View style={styles.infoItem}>
                        <Ionicons name="time-outline" size={16} color="#6B7280" />
                        <Text style={styles.infoText}>
                          {macrocycle.microcycleDurationDays * macrocycle.totalMicrocycles} días total
                        </Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Ionicons name="layers-outline" size={16} color="#6B7280" />
                        <Text style={styles.infoText}>
                          {macrocycle.totalMicrocycles} microciclos
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.macrocycleDate}>
                      Creado el {formatDate(macrocycle.createdAt)}
                    </Text>
                  </View>
                  
                  {/* Botón de eliminar */}
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteMacrocycle(macrocycle.id, macrocycle.name)}
                    disabled={deletingId === macrocycle.id}
                    activeOpacity={0.7}
                  >
                    {deletingId === macrocycle.id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Advertencia si hay 3 macrociclos */}
      {macrocycles.length >= 3 && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={20} color="#F59E0B" />
          <Text style={styles.warningText}>
            Has alcanzado el límite de 3 macrociclos activos
          </Text>
        </View>
      )}
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
  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
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
  macrocycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  macrocycleInfo: {
    flex: 1,
    marginRight: 12,
  },
  macrocycleName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  macrocycleDescription: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  macrocycleDate: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '400',
    marginTop: 8,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
    borderRadius: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
});

export default MacrocyclesScreen;