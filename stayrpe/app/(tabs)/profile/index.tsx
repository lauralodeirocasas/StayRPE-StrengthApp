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

interface UserProfile {
  username: string;
  firstName: string;
  lastName: string;
  age: number;
  height: number;
  weight: number;
  sex: string;
  fitnessGoal: string;
  experienceLevel: string;
  onboardingComplete: boolean;
}

const ProfileScreen = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  const API_URL = 'http://192.168.0.57:8080';

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
        loadProfile();
      }
    }, [token])
  );

  const loadProfile = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/user/profile`, {
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
        setProfile(data);
      } else {
        Alert.alert('Error', 'No se pudo cargar el perfil');
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("token");
              await AsyncStorage.removeItem("onboardingComplete");
              router.replace("/");
            } catch (error) {
              console.error('Error cerrando sesión:', error);
            }
          }
        }
      ]
    );
  };

  const getFitnessGoalDisplay = (goal: string) => {
    const goals = {
      'lose_weight': 'Perder peso',
      'gain_muscle': 'Ganar músculo',
      'improve_fitness': 'Mejorar condición física',
      'maintain': 'Mantener forma física'
    };
    return goals[goal] || goal;
  };

  const getExperienceLevelDisplay = (level: string) => {
    const levels = {
      'beginner': 'Principiante',
      'intermediate': 'Intermedio',
      'advanced': 'Avanzado'
    };
    return levels[level] || level;
  };

  const getSexDisplay = (sex: string) => {
    const sexOptions = {
      'male': 'Masculino',
      'female': 'Femenino',
      'other': 'Otro'
    };
    return sexOptions[sex] || sex;
  };

  if (!token || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E4B8B" />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={80} color="#D1D5DB" />
          <Text style={styles.errorTitle}>Error al cargar perfil</Text>
          <Text style={styles.errorSubtitle}>No se pudo obtener la información del usuario</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Mi Perfil</Text>
            <Text style={styles.headerSubtitle}>Información personal y configuración</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={40} color="#5E4B8B" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {profile.firstName} {profile.lastName}
              </Text>
              <Text style={styles.userUsername}>{profile.username}</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="calendar-outline" size={16} color="#5E4B8B" />
              </View>
              <Text style={styles.statLabel}>Edad</Text>
              <Text style={styles.statValue}>{profile.age} años</Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="resize-outline" size={16} color="#5E4B8B" />
              </View>
              <Text style={styles.statLabel}>Altura</Text>
              <Text style={styles.statValue}>{profile.height} cm</Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="scale-outline" size={16} color="#5E4B8B" />
              </View>
              <Text style={styles.statLabel}>Peso</Text>
              <Text style={styles.statValue}>{profile.weight} kg</Text>
            </View>
          </View>
        </View>

        <View style={styles.fitnessCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="fitness" size={20} color="#5E4B8B" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Información</Text>
                <Text style={styles.cardSubtitle}>Tus objetivos y experiencia</Text>
              </View>
            </View>
          </View>

          <View style={styles.fitnessDetails}>
            <View style={styles.fitnessItem}>
              <Text style={styles.fitnessLabel}>Sexo</Text>
              <Text style={styles.fitnessValue}>{getSexDisplay(profile.sex)}</Text>
            </View>

            <View style={styles.fitnessItem}>
              <Text style={styles.fitnessLabel}>Objetivo</Text>
              <Text style={styles.fitnessValue}>{getFitnessGoalDisplay(profile.fitnessGoal)}</Text>
            </View>

            <View style={styles.fitnessItem}>
              <Text style={styles.fitnessLabel}>Nivel de experiencia</Text>
              <Text style={styles.fitnessValue}>{getExperienceLevelDisplay(profile.experienceLevel)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.optionsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="settings" size={20} color="#5E4B8B" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Opciones</Text>
                <Text style={styles.cardSubtitle}>Configuración y datos</Text>
              </View>
            </View>
          </View>

          <View style={styles.optionsList}>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => router.push('/(tabs)/profile/workout-history')}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionIconContainer}>
                  <Ionicons name="barbell" size={20} color="#5E4B8B" />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Historial de Entrenamientos</Text>
                  <Text style={styles.optionSubtitle}>Ver entrenamientos completados</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => router.push('/(tabs)/profile/archived-macrocycles')}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionIconContainer}>
                  <Ionicons name="archive" size={20} color="#5E4B8B" />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Macrociclos Archivados</Text>
                  <Text style={styles.optionSubtitle}>Ver macrociclos guardados</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => router.push('/(tabs)/profile/edit-profile')}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionIconContainer}>
                  <Ionicons name="pencil" size={20} color="#5E4B8B" />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Editar Perfil</Text>
                  <Text style={styles.optionSubtitle}>Actualizar información personal</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <View style={styles.logoutButtonContent}>
            <Ionicons name="log-out" size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </View>
        </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#5E4B8B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: '#EDE9FE',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '700',
  },
  fitnessCard: {
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
  fitnessDetails: {
    gap: 16,
  },
  fitnessItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  fitnessLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  fitnessValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  optionsCard: {
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
  optionsList: {
    gap: 4,
  },
  optionItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutButton: {
    backgroundColor: '#5E4B8B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 50
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ProfileScreen;