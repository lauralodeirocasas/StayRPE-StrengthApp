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

interface ArchivedMacrocycle {
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

const ArchivedMacrocyclesScreen = () => {
  const [archivedMacrocycles, setArchivedMacrocycles] = useState<ArchivedMacrocycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [unarchivingId, setUnarchivingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showInfoCard, setShowInfoCard] = useState(true);
  const router = useRouter();

  const API_URL = 'http://192.168.0.57:8080';

  const getInfoCardKey = (username: string) => `archived_macrocycles_info_hidden_${username}`;

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
        loadArchivedMacrocycles();
      }
    }, [token])
  );

  const loadArchivedMacrocycles = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/macrocycles/archived`, {
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
        setArchivedMacrocycles(data);
      } else {
        Alert.alert('Error', 'No se pudieron cargar los macrociclos archivados');
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const unarchiveMacrocycle = async (macrocycle: ArchivedMacrocycle) => {
    if (!token) return;

    Alert.alert(
      'Desarchivar Macrociclo',
      `¿Quieres restaurar "${macrocycle.name}" a tus macrociclos activos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desarchivar',
          onPress: async () => {
            try {
              setUnarchivingId(macrocycle.id);
              
              const response = await fetch(`${API_URL}/macrocycles/${macrocycle.id}/unarchive`, {
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
                setArchivedMacrocycles(prev => prev.filter(m => m.id !== macrocycle.id));
                Alert.alert('Desarchivado', data.message || 'Macrociclo restaurado correctamente');
              } else {
                Alert.alert('Error', data.error || 'Error al desarchivar macrociclo');
              }
            } catch (error) {
              console.error('Error desarchivando macrociclo:', error);
              Alert.alert('Error', 'No se pudo conectar con el servidor');
            } finally {
              setUnarchivingId(null);
            }
          }
        }
      ]
    );
  };

  const deleteMacrocycle = async (macrocycle: ArchivedMacrocycle) => {
    if (!token) return;

    Alert.alert(
      'Eliminar Permanentemente',
      `¿Estás seguro de que quieres eliminar "${macrocycle.name}" de forma permanente? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(macrocycle.id);
              
              const response = await fetch(`${API_URL}/macrocycles/${macrocycle.id}`, {
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
                setArchivedMacrocycles(prev => prev.filter(m => m.id !== macrocycle.id));
                Alert.alert('Eliminado', data.message || 'Macrociclo eliminado permanentemente');
              } else {
                Alert.alert('Error', data.error || 'Error al eliminar macrociclo');
              }
            } catch (error) {
              console.error('Error eliminando macrociclo:', error);
              Alert.alert('Error', 'No se pudo conectar con el servidor');
            } finally {
              setDeletingId(null);
            }
          }
        }
      ]
    );
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
            <Text style={styles.headerTitle}>Macrociclos Archivados</Text>
            <Text style={styles.headerSubtitle}>
              {archivedMacrocycles.length} macrociclo{archivedMacrocycles.length !== 1 ? 's' : ''} archivado{archivedMacrocycles.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {archivedMacrocycles.length > 0 && showInfoCard && currentUsername && (
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
              • Los macrociclos archivados no cuentan para el límite de 3 activos{'\n'}
              • Puedes desarchivar un macrociclo para volver a usarlo{'\n'}
              • La eliminación permanente no se puede deshacer
            </Text>
          </View>
        )}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5E4B8B" />
            <Text style={styles.loadingText}>Cargando macrociclos archivados...</Text>
          </View>
        ) : archivedMacrocycles.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="archive-outline" size={64} color="#5E4B8B" />
            </View>
            <Text style={styles.emptyTitle}>No hay macrociclos archivados</Text>
            <Text style={styles.emptySubtitle}>
              Los macrociclos que archives aparecerán aquí
            </Text>
          </View>
        ) : (
          <View style={styles.macrocyclesList}>
            {archivedMacrocycles.map((macrocycle) => (
              <View key={macrocycle.id} style={styles.macrocycleCard}>
                <View style={styles.macrocycleHeader}>
                  <View style={styles.macrocycleInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.macrocycleName}>{macrocycle.name}</Text>
                      <View style={styles.archivedBadge}>
                        <Ionicons name="archive" size={12} color="white" />
                        <Text style={styles.archivedBadgeText}>ARCHIVADO</Text>
                      </View>
                    </View>
                    
                    {macrocycle.description && (
                      <Text style={styles.macrocycleDescription}>{macrocycle.description}</Text>
                    )}
                    
                    <View style={styles.infoRow}>
                      <View style={styles.infoItem}>
                        <View style={styles.infoIconContainer}>
                          <Ionicons name="calendar-outline" size={14} color="#8B7AB8" />
                        </View>
                        <Text style={styles.infoText}>
                          {formatDate(macrocycle.startDate)} - {calculateEndDate(macrocycle.startDate, macrocycle.microcycleDurationDays, macrocycle.totalMicrocycles)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoRow}>
                      <View style={styles.infoItem}>
                        <View style={styles.infoIconContainer}>
                          <Ionicons name="time-outline" size={14} color="#8B7AB8" />
                        </View>
                        <Text style={styles.infoText}>
                          {macrocycle.microcycleDurationDays * macrocycle.totalMicrocycles} días total
                        </Text>
                      </View>
                      <View style={styles.infoItem}>
                        <View style={styles.infoIconContainer}>
                          <Ionicons name="layers-outline" size={14} color="#8B7AB8" />
                        </View>
                        <Text style={styles.infoText}>
                          {macrocycle.totalMicrocycles} microciclos
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.macrocycleDate}>
                      Archivado • Creado el {formatDate(macrocycle.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.unarchiveButton]}
                      onPress={() => unarchiveMacrocycle(macrocycle)}
                      disabled={unarchivingId === macrocycle.id}
                      activeOpacity={0.85}
                    >
                      {unarchivingId === macrocycle.id ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Ionicons name="refresh" size={18} color="white" />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => deleteMacrocycle(macrocycle)}
                      disabled={deletingId === macrocycle.id}
                      activeOpacity={0.85}
                    >
                      {deletingId === macrocycle.id ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Ionicons name="trash" size={18} color="white" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
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
  },
  macrocyclesList: {
    gap: 16,
  },
  macrocycleCard: {
    backgroundColor: 'white',
    borderRadius: 20,
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
    padding: 20,
  },
  macrocycleInfo: {
    flex: 1,
    marginRight: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  macrocycleName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1B4E',
    flex: 1,
  },
  archivedBadge: {
    backgroundColor: '#5E4B8B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
    marginLeft: 8,
  },
  archivedBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  macrocycleDescription: {
    fontSize: 15,
    color: '#6B5B95',
    marginBottom: 12,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  infoIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#F8F7FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  macrocycleDate: {
    fontSize: 13,
    color: '#8B7AB8',
    fontWeight: '400',
    marginTop: 8,
  },
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
  unarchiveButton: {
    backgroundColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOpacity: 0.25,
  },
  deleteButton: {
    backgroundColor: '#5E4B8B',
    shadowColor: '#5E4B8B',
    shadowOpacity: 0.3,
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
});

export default ArchivedMacrocyclesScreen;