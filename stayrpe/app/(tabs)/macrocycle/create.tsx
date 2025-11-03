import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Dimensions,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const CreateMacrocycleScreen = () => {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [microcycleDurationDays, setMicrocycleDurationDays] = useState(7);
  const [totalMicrocycles, setTotalMicrocycles] = useState(4);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const API_URL =  process.env.EXPO_PUBLIC_API_BASE;

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

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateEndDate = (startDate: Date, microcycleDays: number, totalMicrocycles: number) => {
    const totalDays = microcycleDays * totalMicrocycles;
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + totalDays - 1);
    return endDate;
  };

  const onDayPress = (day: any) => {
    const selectedDate = new Date(day.year, day.month - 1, day.day);
    setStartDate(selectedDate);
    setShowDateModal(false);
  };

  const getMarkedDates = () => {
    const dateString = startDate.toISOString().split('T')[0];
    return {
      [dateString]: {
        selected: true,
        selectedColor: '#5E4B8B',
        selectedTextColor: 'white'
      }
    };
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const adjustMicrocycleDays = (increment: boolean) => {
    if (increment && microcycleDurationDays < 14) {
      setMicrocycleDurationDays(microcycleDurationDays + 1);
    } else if (!increment && microcycleDurationDays > 1) {
      setMicrocycleDurationDays(microcycleDurationDays - 1);
    }
  };

  const adjustTotalMicrocycles = (increment: boolean) => {
    if (increment && totalMicrocycles < 52) {
      setTotalMicrocycles(totalMicrocycles + 1);
    } else if (!increment && totalMicrocycles > 1) {
      setTotalMicrocycles(totalMicrocycles - 1);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (!validateForm()) {
      return;
    }
    
    const macrocycleData = {
      name: name.trim(),
      description: description.trim(),
      startDate: formatDateForAPI(startDate),
      microcycleDurationDays: microcycleDurationDays,
      totalMicrocycles: totalMicrocycles,
    };
    
    router.push({
      pathname: '/(tabs)/macrocycle/plan',
      params: macrocycleData
    });
  };

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E4B8B" />
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
            <Text style={styles.headerTitle}>Nuevo Macrociclo</Text>
            <Text style={styles.headerSubtitle}>Planifica tu entrenamiento</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre del Macrociclo</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej. Volumen Primavera 2024"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripción</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe tu macrociclo (opcional)"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        <View style={styles.configCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="time" size={20} color="#5E4B8B" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Configuración Temporal</Text>
                <Text style={styles.cardSubtitle}>Fechas y duración del macrociclo</Text>
              </View>
            </View>
          </View>

          <View style={styles.configRow}>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Fecha de inicio</Text>
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => setShowDateModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                  <Text style={styles.dateText}>{formatDateForDisplay(startDate)}</Text>
                  <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.configRow}>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Duración microciclo</Text>
              <View style={styles.inputWrapper}>
                <TouchableOpacity
                  style={[styles.adjustButton, microcycleDurationDays <= 1 && styles.adjustButtonDisabled]}
                  onPress={() => adjustMicrocycleDays(false)}
                  disabled={microcycleDurationDays <= 1}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={16} color={microcycleDurationDays <= 1 ? "#D1D5DB" : "#6B7280"} />
                </TouchableOpacity>
                
                <View style={styles.numberDisplay}>
                  <Text style={styles.numberText}>{microcycleDurationDays}</Text>
                  <Text style={styles.unitLabel}>días</Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.adjustButton, microcycleDurationDays >= 14 && styles.adjustButtonDisabled]}
                  onPress={() => adjustMicrocycleDays(true)}
                  disabled={microcycleDurationDays >= 14}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color={microcycleDurationDays >= 14 ? "#D1D5DB" : "#6B7280"} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Total microciclos</Text>
              <View style={styles.inputWrapper}>
                <TouchableOpacity
                  style={[styles.adjustButton, totalMicrocycles <= 1 && styles.adjustButtonDisabled]}
                  onPress={() => adjustTotalMicrocycles(false)}
                  disabled={totalMicrocycles <= 1}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={16} color={totalMicrocycles <= 1 ? "#D1D5DB" : "#6B7280"} />
                </TouchableOpacity>
                
                <View style={styles.numberDisplay}>
                  <Text style={styles.numberText}>{totalMicrocycles}</Text>
                  <Text style={styles.unitLabel}>micros</Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.adjustButton, totalMicrocycles >= 52 && styles.adjustButtonDisabled]}
                  onPress={() => adjustTotalMicrocycles(true)}
                  disabled={totalMicrocycles >= 52}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color={totalMicrocycles >= 52 ? "#D1D5DB" : "#6B7280"} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Resumen</Text>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryText}>
                • Duración total: {microcycleDurationDays * totalMicrocycles} días
              </Text>
              <Text style={styles.summaryText}>
                • {totalMicrocycles} microciclos de {microcycleDurationDays} días cada uno
              </Text>
              <Text style={styles.summaryText}>
                • Desde {formatDateForDisplay(startDate)} hasta {formatDateForDisplay(calculateEndDate(startDate, microcycleDurationDays, totalMicrocycles))}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            !name.trim() && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!name.trim()}
          activeOpacity={0.9}
        >
          <View style={styles.continueButtonContent}>
            <Ionicons name="arrow-forward" size={20} color="white" />
            <Text style={styles.continueButtonText}>Continuar</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showDateModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>Seleccionar Fecha</Text>
              <Text style={styles.modalSubtitle}>Elige cuándo empezar</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDateModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.calendarContainer}>
              <Calendar
                onDayPress={onDayPress}
                markedDates={getMarkedDates()}
                minDate={getMinDate()}
                theme={{
                  backgroundColor: 'transparent',
                  calendarBackground: 'transparent',
                  textSectionTitleColor: '#6B7280',
                  selectedDayBackgroundColor: '#5E4B8B',
                  selectedDayTextColor: '#FFFFFF',
                  todayTextColor: '#5E4B8B',
                  dayTextColor: '#1F2937',
                  textDisabledColor: '#D1D5DB',
                  arrowColor: '#5E4B8B',
                  disabledArrowColor: '#D1D5DB',
                  monthTextColor: '#1F2937',
                  indicatorColor: '#5E4B8B',
                  textDayFontWeight: '500',
                  textMonthFontWeight: '700',
                  textDayHeaderFontWeight: '600',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 14,
                }}
                style={styles.calendar}
                hideExtraDays={true}
                firstDay={1}
                enableSwipeMonths={true}
              />
            </View>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formCard: {
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '400',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  configCard: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
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
  configRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  configItem: {
    flex: 1,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dateSelector: {},
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonDisabled: {
    backgroundColor: '#F9FAFB',
  },
  numberDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  numberText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '700',
  },
  unitLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryContainer: {
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5E4B8B',
    marginBottom: 8,
  },
  summaryContent: {
    gap: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#5E4B8B',
    fontWeight: '500',
  },
  continueButton: {
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
  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
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
  calendarContainer: {
    flex: 1,
  },
  calendar: {
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    backgroundColor: 'white',
    paddingVertical: 10,
  },
});

export default CreateMacrocycleScreen;