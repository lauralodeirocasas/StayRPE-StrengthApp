import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// INTERFACES
// ============================================================================

interface SetInfo {
  setId: number;
  setNumber: number;
  originalRepsMin: number;
  originalRepsMax: number;
  originalWeight: number;
  originalRir?: number;
  originalRpe?: number;
  originalNotes?: string;
  customRepsMin?: number;
  customRepsMax?: number;
  customWeight?: number;
  customRir?: number;
  customRpe?: number;
  customNotes?: string;
  effectiveRepsMin: number;
  effectiveRepsMax: number;
  effectiveWeight: number;
  effectiveRir?: number;
  effectiveRpe?: number;
  effectiveNotes?: string;
  isCustomized: boolean;
}

interface ExerciseCustomization {
  routineExerciseId: number;
  exerciseId: number;
  exerciseName: string;
  exerciseMuscle: string;
  order: number;
  numberOfSets: number;
  restBetweenSets?: number;
  exerciseNotes?: string;
  sets: SetInfo[];
  hasCustomizedSets: boolean;
  customizedSetsCount: number;
}

interface DayCustomizationResponse {
  absoluteDay: number;
  actualDate: string;
  routineName: string;
  routineDescription?: string;
  hasCustomizations: boolean;
  totalCustomizations: number;
  exercises: ExerciseCustomization[];
}

interface SetCustomization {
  exerciseSetId: number;
  customRepsMin?: number;
  customRepsMax?: number;
  customWeight?: number;
  customRir?: number;
  customRpe?: number;
  customNotes?: string;
}

interface EditingSet {
  setInfo: SetInfo;
  exerciseIndex: number;
  setIndex: number;
  exerciseName: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const CustomizeDayScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  // ============================================================================
  // CONSTANTES
  // ============================================================================

  const API_URL = 'http://192.168.0.57:8080';
  const macrocycleId = params.macrocycleId as string;
  const absoluteDay = parseInt(params.absoluteDay as string);
  const routineName = params.routineName as string;

  // ============================================================================
  // ESTADOS
  // ============================================================================

  // Estados principales
  const [dayData, setDayData] = useState<DayCustomizationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Estados para modal de edición
  const [editingSet, setEditingSet] = useState<EditingSet | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Estados para formulario de edición
  const [tempRepsMin, setTempRepsMin] = useState('');
  const [tempRepsMax, setTempRepsMax] = useState('');
  const [tempWeight, setTempWeight] = useState('');
  const [tempIntensity, setTempIntensity] = useState('');
  const [tempNotes, setTempNotes] = useState('');
  const [intensityType, setIntensityType] = useState<'RIR' | 'RPE'>('RIR');

  // Estado para InfoCard
  const [showInfoCard, setShowInfoCard] = useState(true);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Cargar token
  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      setToken(storedToken);
    };
    getToken();
  }, []);

  // Cargar preferencia de InfoCard
  useEffect(() => {
    const loadInfoCardPreference = async () => {
      try {
        const hideInfoCard = await AsyncStorage.getItem('hideCustomizationInfo');
        if (hideInfoCard === 'true') {
          setShowInfoCard(false);
        }
      } catch (error) {
        console.log('Error loading info card preference:', error);
      }
    };
    loadInfoCardPreference();
  }, []);

  // Cargar datos del día cuando el componente recibe foco
  useFocusEffect(
    React.useCallback(() => {
      if (token && macrocycleId && absoluteDay) {
        loadDayData();
      }
    }, [token, macrocycleId, absoluteDay])
  );

  // ============================================================================
  // FUNCIONES DE API
  // ============================================================================

  const loadDayData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/macrocycles/${macrocycleId}/days/${absoluteDay}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
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
        console.log('🔥 Datos crudos del backend:', JSON.stringify(data, null, 2));
        setDayData(data);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'No se pudo cargar la información del día');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
  if (!dayData || !token) return;
  
  try {
    setSaving(true);

    const setCustomizations: SetCustomization[] = [];
    
    // Debug: Analizar cada ejercicio y serie
    console.log('🔍 DEBUGGING - Analizando datos antes de enviar:');
    dayData.exercises.forEach((exercise, exerciseIndex) => {
      console.log(`\n📝 Ejercicio ${exerciseIndex + 1}: ${exercise.exerciseName}`);
      exercise.sets.forEach((setInfo, setIndex) => {
        console.log(`  📊 Serie ${setIndex + 1}:`, {
          setId: setInfo.setId,
          isCustomized: setInfo.isCustomized,
          customRepsMin: setInfo.customRepsMin,
          customRepsMax: setInfo.customRepsMax,
          customWeight: setInfo.customWeight,
          customRir: setInfo.customRir,
          customRpe: setInfo.customRpe,
          customNotes: setInfo.customNotes,
        });
        
        // 🔥 INCLUIR TODAS las series para que el backend pueda decidir
        const customization: SetCustomization = {
          exerciseSetId: setInfo.setId,
          customRepsMin: setInfo.customRepsMin,
          customRepsMax: setInfo.customRepsMax,
          customWeight: setInfo.customWeight,
          customRir: setInfo.customRir,
          customRpe: setInfo.customRpe,
          customNotes: setInfo.customNotes,
        };
        
        // Validar que los datos obligatorios estén presentes
        if (!setInfo.setId) {
          console.error('❌ ERROR: setId es undefined para serie');
          return;
        }
        
        console.log(`  ✅ Agregando serie (${setInfo.isCustomized ? 'customizada' : 'original'}):`, customization);
        setCustomizations.push(customization);
      });
    });

    const requestData = {
      absoluteDay: dayData.absoluteDay,
      setCustomizations: setCustomizations
    };

    console.log('\n🚀 DATOS FINALES A ENVIAR:');
    console.log('Absolute Day:', requestData.absoluteDay);
    console.log('Número total de series:', setCustomizations.length);
    console.log('Customizaciones completas:', JSON.stringify(setCustomizations, null, 2));

    const response = await fetch(
      `${API_URL}/macrocycles/${macrocycleId}/days/${absoluteDay}/customize`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      }
    );

    if (response.status === 401) {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("onboardingComplete");
      Alert.alert("Sesión Expirada", "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", [
        { text: "OK", onPress: () => router.replace("/") }
      ]);
      return;
    }

    if (response.ok) {
      // 🔥 CAMBIO PRINCIPAL: No recargar inmediatamente, mantener estado local
      setHasUnsavedChanges(false);
      
      // Contar las customizaciones actuales en el estado local
      const currentCustomizations = dayData.exercises.reduce((total, ex) =>
        total + ex.sets.filter(s => s.isCustomized).length, 0);
        
      console.log('✅ Guardado exitoso. Customizaciones actuales:', currentCustomizations);
      
      Alert.alert(
        'Cambios Guardados',
        currentCustomizations > 0 
          ? `Se han guardado los cambios correctamente para ese dia.`
          : 'Se ha reseteado correctamente.',
        [{ text: 'Vale' }]
      );
      
      // 🔥 ALTERNATIVA: Recargar con delay para que el usuario vea el resultado
      setTimeout(() => {
        console.log('🔄 Recargando datos del servidor para sincronizar...');
        loadDayData();
      }, 1500); // 1.5 segundos después de guardar
    } else {
      const errorData = await response.json();
      console.error('❌ ERROR DEL BACKEND:', errorData);
      console.error('❌ STATUS CODE:', response.status);
      
      Alert.alert('Error', errorData.error || 'No se pudieron guardar los cambios');
    }
  } catch (error) {
    console.error('❌ ERROR DE CONEXIÓN:', error);
    Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor');
  } finally {
    setSaving(false);
  }
};
  // ============================================================================
  // FUNCIONES DE EDICIÓN
  // ============================================================================

  const handleEditSet = (setInfo: SetInfo, exerciseIndex: number, setIndex: number, exerciseName: string) => {
    console.log("🧩 setInfo recibido en handleEditSet:", setInfo);

    setEditingSet({ setInfo, exerciseIndex, setIndex, exerciseName });

    setTempRepsMin(setInfo.effectiveRepsMin?.toString() || '');
    setTempRepsMax(setInfo.effectiveRepsMax?.toString() || '');
    setTempWeight(setInfo.effectiveWeight?.toString() || '');
    setTempNotes(setInfo.effectiveNotes || '');

    if (setInfo.effectiveRpe !== undefined && setInfo.effectiveRpe !== null && setInfo.effectiveRpe >= 1) {
      setIntensityType('RPE');
      setTempIntensity(setInfo.effectiveRpe.toString());
    } else if (setInfo.effectiveRir !== undefined && setInfo.effectiveRir !== null && setInfo.effectiveRir >= 0) {
      setIntensityType('RIR');
      setTempIntensity(setInfo.effectiveRir.toString());
    } else {
      setIntensityType('RIR');
      setTempIntensity('2');
    }
    
    setShowEditModal(true);
  };

  const handleSaveSetEdit = () => {
    if (!editingSet || !dayData) return;
    
    const { exerciseIndex, setIndex } = editingSet;
    const repsMin = parseInt(tempRepsMin);
    const repsMax = parseInt(tempRepsMax);
    const weight = parseFloat(tempWeight);
    const intensity = parseInt(tempIntensity);

    // Validaciones
    if (isNaN(repsMin) || repsMin <= 0) {
      Alert.alert('Error', 'Las repeticiones mínimas deben ser un número mayor a 0');
      return;
    }
    if (isNaN(repsMax) || repsMax <= 0) {
      Alert.alert('Error', 'Las repeticiones máximas deben ser un número mayor a 0');
      return;
    }
    if (repsMin > repsMax) {
      Alert.alert('Error', 'Las repeticiones mínimas no pueden ser mayores que las máximas');
      return;
    }
    if (isNaN(weight) || weight < 0) {
      Alert.alert('Error', 'El peso debe ser un número mayor o igual a 0');
      return;
    }
    if (isNaN(intensity) || intensity < 0) {
      Alert.alert('Error', 'La intensidad debe ser un número válido');
      return;
    }
    if (intensityType === 'RIR' && intensity > 5) {
      Alert.alert('Error', 'El RIR debe estar entre 0 y 5');
      return;
    }
    if (intensityType === 'RPE' && (intensity < 1 || intensity > 10)) {
      Alert.alert('Error', 'El RPE debe estar entre 1 y 10');
      return;
    }

    // Actualizar datos
    const newDayData = JSON.parse(JSON.stringify(dayData));
    const exercise = newDayData.exercises[exerciseIndex];
    const setInfo = exercise.sets[setIndex];

    setInfo.customRepsMin = repsMin;
    setInfo.customRepsMax = repsMax;
    setInfo.customWeight = weight;
    setInfo.customNotes = tempNotes.trim() || undefined;

    if (intensityType === 'RIR') {
      setInfo.customRir = intensity;
      setInfo.customRpe = null;
    } else {
      setInfo.customRpe = intensity;
      setInfo.customRir = null;
    }

    setInfo.effectiveRepsMin = repsMin;
    setInfo.effectiveRepsMax = repsMax;
    setInfo.effectiveWeight = weight;

    if (intensityType === 'RIR') {
      setInfo.effectiveRir = intensity;
      setInfo.effectiveRpe = setInfo.originalRpe;
    } else {
      setInfo.effectiveRpe = intensity;
      setInfo.effectiveRir = setInfo.originalRir;
    }

    setInfo.effectiveNotes = tempNotes.trim() || setInfo.originalNotes;
    setInfo.isCustomized = true;

    exercise.customizedSetsCount = exercise.sets.filter(s => s.isCustomized).length;
    exercise.hasCustomizedSets = exercise.customizedSetsCount > 0;

    const totalCustomizations = newDayData.exercises.reduce((total, ex) =>
      total + ex.sets.filter(s => s.isCustomized).length, 0);

    newDayData.totalCustomizations = totalCustomizations;
    newDayData.hasCustomizations = totalCustomizations > 0;

    setDayData(newDayData);
    setHasUnsavedChanges(true);
    setShowEditModal(false);
    setEditingSet(null);
  };

  // ============================================================================
  // FUNCIONES DE RESET
  // ============================================================================

  

  const handleResetAllCustomizations = () => {
    if (!dayData || !dayData.hasCustomizations) return;
    
    Alert.alert(
      'Resetear Todo',
      `¿Estás seguro de que quieres resetear la rutina con los valores prederminados apar ese dia?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetear Todo',
          style: 'destructive',
          onPress: () => {
            const newDayData = JSON.parse(JSON.stringify(dayData));
            
            newDayData.exercises.forEach(exercise => {
              exercise.sets.forEach(setInfo => {
                setInfo.customRepsMin = undefined;
                setInfo.customRepsMax = undefined;
                setInfo.customWeight = undefined;
                setInfo.customRir = undefined;
                setInfo.customRpe = undefined;
                setInfo.customNotes = undefined;
                setInfo.effectiveRepsMin = setInfo.originalRepsMin;
                setInfo.effectiveRepsMax = setInfo.originalRepsMax;
                setInfo.effectiveWeight = setInfo.originalWeight;
                setInfo.effectiveRir = setInfo.originalRir;
                setInfo.effectiveRpe = setInfo.originalRpe;
                setInfo.effectiveNotes = setInfo.originalNotes;
                setInfo.isCustomized = false;
              });
              exercise.customizedSetsCount = 0;
              exercise.hasCustomizedSets = false;
            });
            
            newDayData.totalCustomizations = 0;
            newDayData.hasCustomizations = false;
            setDayData(newDayData);
            setHasUnsavedChanges(true);
          }
        }
      ]
    );
  };

  // ============================================================================
  // FUNCIONES DE NAVEGACIÓN Y UTILIDADES
  // ============================================================================

  const handleBackPress = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Cambios sin guardar',
        '¿Estás seguro de que quieres salir? Se perderán los cambios no guardados.',
        [
          { text: 'Continuar editando', style: 'cancel' },
          { text: 'Salir y descartar cambios', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  const handleCloseInfoCard = async () => {
    try {
      await AsyncStorage.setItem('hideCustomizationInfo', 'true');
      setShowInfoCard(false);
    } catch (error) {
      console.log('Error saving info card preference:', error);
      setShowInfoCard(false); // Cerrar de todas formas
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    } catch {
      return dateString;
    }
  };

  const getIntensityLabel = (setInfo: SetInfo) => {
    if (setInfo.isCustomized) {
      if (setInfo.effectiveRpe !== undefined && setInfo.effectiveRpe !== null && setInfo.effectiveRpe >= 1) {
        return `@${setInfo.effectiveRpe} RPE`;
      }
      if (setInfo.effectiveRir !== undefined && setInfo.effectiveRir !== null && setInfo.effectiveRir >= 0) {
        return `${setInfo.effectiveRir} RIR`;
      }
    } else {
      if (setInfo.effectiveRir !== undefined && setInfo.effectiveRir !== null && setInfo.effectiveRir >= 0) {
        return `${setInfo.effectiveRir} RIR`;
      }
      if (setInfo.effectiveRpe !== undefined && setInfo.effectiveRpe !== null && setInfo.effectiveRpe >= 1) {
        return `@${setInfo.effectiveRpe} RPE`;
      }
    }
    return null;
  };

  // ============================================================================
  // COMPONENTES DE RENDERIZADO
  // ============================================================================

  const renderSetCard = (setInfo: SetInfo, exerciseIndex: number, setIndex: number, exerciseName: string) => {
    const intensityLabel = getIntensityLabel(setInfo);
    
    // Calcular isCustomized localmente si viene undefined
    const isActuallyCustomized = setInfo.isCustomized !== undefined 
      ? setInfo.isCustomized 
      : !!(setInfo.customRepsMin || setInfo.customRepsMax || setInfo.customWeight || setInfo.customRir || setInfo.customRpe || setInfo.customNotes);
    
    return (
      <View key={setInfo.setId} style={styles.setCard}>
        <View style={styles.setHeader}>
          <View style={styles.setNumberContainer}>
            <Text style={styles.setNumber}>Serie {setInfo.setNumber}</Text>
            {isActuallyCustomized && (
              <View style={styles.editedBadge}>
                <Text style={styles.editedBadgeText}>Editada</Text>
              </View>
            )}
          </View>
          <View style={styles.setActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditSet(setInfo, exerciseIndex, setIndex, exerciseName)}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={16} color="#5E4B8B" />
              <Text style={styles.editButtonText}>Editar</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.setContent}>
          <View style={styles.setInfo}>
            <Text style={styles.setDescription}>
              {setInfo.effectiveRepsMin === setInfo.effectiveRepsMax
                ? `${setInfo.effectiveRepsMin} reps`
                : `${setInfo.effectiveRepsMin}-${setInfo.effectiveRepsMax} reps`
              } × {setInfo.effectiveWeight}kg
              {intensityLabel && ` (${intensityLabel})`}
            </Text>
            {setInfo.effectiveNotes && (
              <Text style={styles.setNotes}>{setInfo.effectiveNotes}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderExerciseCard = (exercise: ExerciseCustomization, exerciseIndex: number) => {
    return (
      <View key={exercise.routineExerciseId} style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseNumberContainer}>
            <Text style={styles.exerciseNumber}>{exercise.order}</Text>
          </View>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
            <View style={styles.exerciseMeta}>
              <View style={styles.muscleChip}>
                <Text style={styles.muscleText}>{exercise.exerciseMuscle}</Text>
              </View>
              <Text style={styles.setsCount}>
                {exercise.numberOfSets} series
              </Text>
              {exercise.hasCustomizedSets && (
                <View style={styles.customizedSetsIndicator}>
                  <Text style={styles.customizedSetsText}>
                    {exercise.customizedSetsCount} editada{exercise.customizedSetsCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        {exercise.exerciseNotes && (
          <View style={styles.exerciseNotesContainer}>
            <Ionicons name="information-circle" size={14} color="#6B7280" />
            <Text style={styles.exerciseNotesText}>{exercise.exerciseNotes}</Text>
          </View>
        )}
        
        <View style={styles.setsContainer}>
          {exercise.sets.map((setInfo, setIndex) =>
            renderSetCard(setInfo, exerciseIndex, setIndex, exercise.exerciseName)
          )}
        </View>
      </View>
    );
  };

  const renderEditModal = () => {
    if (!editingSet) return null;
    
    const { setInfo, exerciseName } = editingSet;
    const maxIntensity = intensityType === 'RIR' ? 5 : 10;
    const minIntensity = intensityType === 'RIR' ? 0 : 1;
    
    return (
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Header del modal */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Editar Serie {setInfo.setNumber}</Text>
                  <Text style={styles.modalSubtitle}>{exerciseName}</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowEditModal(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              {/* Cuerpo del modal */}
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Valores originales */}
                <View style={styles.originalComparisonCard}>
                  <Text style={styles.originalComparisonTitle}>Valores originales:</Text>
                  <Text style={styles.originalComparisonText}>
                    {setInfo.originalRepsMin === setInfo.originalRepsMax
                      ? `${setInfo.originalRepsMin} reps`
                      : `${setInfo.originalRepsMin}-${setInfo.originalRepsMax} reps`
                    } × {setInfo.originalWeight}kg
                    {setInfo.originalRir && ` (${setInfo.originalRir} RIR)`}
                    {setInfo.originalRpe && ` (@${setInfo.originalRpe} RPE)`}
                  </Text>
                </View>
                
                {/* Repeticiones */}
                <View style={styles.inputSection}>
                  <Text style={styles.sectionTitle}>Repeticiones</Text>
                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Mínimas</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={tempRepsMin}
                        onChangeText={setTempRepsMin}
                        placeholder={setInfo.originalRepsMin.toString()}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        selectTextOnFocus={true}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Máximas</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={tempRepsMax}
                        onChangeText={setTempRepsMax}
                        placeholder={setInfo.originalRepsMax.toString()}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        selectTextOnFocus={true}
                      />
                    </View>
                  </View>
                </View>
                
                {/* Peso */}
                <View style={styles.inputSection}>
                  <Text style={styles.sectionTitle}>Peso</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Kilogramos</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={tempWeight}
                      onChangeText={setTempWeight}
                      placeholder={setInfo.originalWeight.toString()}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      selectTextOnFocus={true}
                    />
                  </View>
                </View>
                
                {/* Intensidad */}
                {(setInfo.originalRir !== undefined || setInfo.originalRpe !== undefined) && (
                  <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle}>Intensidad</Text>
                    <View style={styles.intensityToggle}>
                      <TouchableOpacity
                        style={[
                          styles.intensityButton,
                          intensityType === 'RIR' && styles.intensityButtonActive
                        ]}
                        onPress={() => {
                          setIntensityType('RIR');
                          let newValue = '';
                          if (setInfo.customRir !== undefined && setInfo.customRir !== null) {
                            newValue = setInfo.customRir.toString();
                          } else if (setInfo.originalRir !== undefined && setInfo.originalRir !== null) {
                            newValue = setInfo.originalRir.toString();
                          } else {
                            newValue = '2';
                          }
                          setTempIntensity(newValue);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.intensityButtonText,
                          intensityType === 'RIR' && styles.intensityButtonTextActive
                        ]}>RIR</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.intensityButton,
                          intensityType === 'RPE' && styles.intensityButtonActive
                        ]}
                        onPress={() => {
                          setIntensityType('RPE');
                          let newValue = '';
                          if (setInfo.customRpe !== undefined && setInfo.customRpe !== null) {
                            newValue = setInfo.customRpe.toString();
                          } else if (setInfo.originalRpe !== undefined && setInfo.originalRpe !== null) {
                            newValue = setInfo.originalRpe.toString();
                          } else {
                            newValue = '8';
                          }
                          setTempIntensity(newValue);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.intensityButtonText,
                          intensityType === 'RPE' && styles.intensityButtonTextActive
                        ]}>RPE</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        {intensityType} ({minIntensity}-{maxIntensity})
                      </Text>
                      <TextInput
                        style={styles.numberInput}
                        value={tempIntensity}
                        onChangeText={setTempIntensity}
                        placeholder={intensityType === 'RIR' ? '2' : '8'}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        selectTextOnFocus={true}
                      />
                    </View>
                  </View>
                )}
                
                {/* Notas */}
                <View style={styles.inputSection}>
                  <Text style={styles.sectionTitle}>Notas (opcional)</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Notas específicas para esta serie</Text>
                    <TextInput
                      style={styles.textAreaInput}
                      value={tempNotes}
                      onChangeText={setTempNotes}
                      placeholder="Ej: Serie de calentamiento, usar drop set..."
                      placeholderTextColor="#9CA3AF"
                      multiline={true}
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
                
                {/* Vista previa */}
                <View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>Vista previa:</Text>
                  <Text style={styles.previewText}>
                    {tempRepsMin && tempRepsMax
                      ? (tempRepsMin === tempRepsMax
                          ? `${tempRepsMin} reps`
                          : `${tempRepsMin}-${tempRepsMax} reps`)
                      : '? reps'
                    } × {tempWeight || '?'}kg
                    {tempIntensity && ` (${intensityType === 'RIR' ? `${tempIntensity} RIR` : `@${tempIntensity} RPE`})`}
                  </Text>
                  {tempNotes.trim() && (
                    <Text style={styles.previewNotes}>Notas: {tempNotes.trim()}</Text>
                  )}
                </View>
              </ScrollView>
              
              {/* Acciones del modal */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowEditModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveSetEdit}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // ============================================================================
  // RENDERIZADO PRINCIPAL
  // ============================================================================

  // Estados de carga y error
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E4B8B" />
          <Text style={styles.loadingText}>Cargando información del día...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dayData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Error al cargar</Text>
          <Text style={styles.errorSubtitle}>No se pudo cargar la información del día</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Renderizado principal
  return (
    <SafeAreaView style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              Día {dayData.absoluteDay} - Personalizar
            </Text>
            <Text style={styles.headerSubtitle}>
              {formatDate(dayData.actualDate)} • {dayData.routineName}
            </Text>
          </View>
          
          {hasUnsavedChanges && (
            <View style={styles.unsavedIndicator}>
              <View style={styles.unsavedDot} />
            </View>
          )}
        </View>
      </View>

      {/* ===== TARJETA DE ESTADÍSTICAS ===== */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="barbell" size={18} color="#5E4B8B" />
            </View>
            <Text style={styles.statLabel}>Ejercicios</Text>
            <Text style={styles.statValue}>{dayData.exercises.length}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="layers" size={18} color="#5E4B8B" />
            </View>
            <Text style={styles.statLabel}>Series totales</Text>
            <Text style={styles.statValue}>
              {dayData.exercises.reduce((total, ex) => total + ex.numberOfSets, 0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="pencil" size={18} color="#5E4B8B" />
            </View>
            <Text style={styles.statLabel}>Editadas</Text>
            <Text style={styles.statValue}>
              {dayData.totalCustomizations}
            </Text>
          </View>
        </View>
      </View>

      {/* ===== CONTENIDO PRINCIPAL ===== */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Lista de ejercicios */}
        {dayData.exercises.map((exercise, exerciseIndex) =>
          renderExerciseCard(exercise, exerciseIndex)
        )}

        {/* Tarjeta de información dismissible */}
        {showInfoCard && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color="#5E4B8B" />
              <Text style={styles.infoTitle}>¿Cómo funciona la personalización?</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>
                • Modifica solo las series que necesites ajustar{'\n'}
                • Los cambios solo afectan a este día específico{'\n'}
                • Puedes resetear series individuales o todo el día{'\n'}
                • Los valores originales de la rutina no se modifican
              </Text>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleCloseInfoCard}
                activeOpacity={0.8}
              >
                <Text style={styles.dismissButtonText}>Entendido, no mostrar más</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Botones de acción */}
        <View style={styles.actionButtonsInline}>
          {dayData.hasCustomizations && (
            <TouchableOpacity
              style={styles.resetAllButton}
              onPress={handleResetAllCustomizations}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color="#5E4B8B" />
              <Text style={styles.resetAllButtonText}>Resetear Todo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.saveChangesButton,
              !hasUnsavedChanges && styles.saveChangesButtonDisabled
            ]}
            onPress={handleSaveChanges}
            disabled={!hasUnsavedChanges || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveChangesButtonText}>
                {hasUnsavedChanges ? 'Guardar Cambios' : 'Sin Cambios'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ===== MODAL DE EDICIÓN ===== */}
      {renderEditModal()}
    </SafeAreaView>
  );
};

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  // ===== CONTENEDOR PRINCIPAL =====
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  // ===== ESTADOS DE CARGA Y ERROR =====
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
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },

  // ===== HEADER =====
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  unsavedIndicator: {
    marginLeft: 8,
  },
  unsavedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5E4B8B',
  },

  // ===== TARJETA DE ESTADÍSTICAS =====
  statsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },

  // ===== CONTENIDO Y SCROLL =====
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // ===== TARJETAS DE EJERCICIOS =====
  exerciseCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5E4B8B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  muscleChip: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  muscleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5E4B8B',
  },
  setsCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  customizedSetsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  customizedSetsText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  exerciseNotesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  exerciseNotesText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // ===== SERIES =====
  setsContainer: {
    gap: 12,
  },
  setCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  editedBadge: {
    backgroundColor: '#5E4B8B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  editedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  setActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#5E4B8B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E4B8B',
  },
  setContent: {
    gap: 12,
  },
  setInfo: {
    gap: 4,
  },
  setDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  setNotes: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // ===== TARJETA DE INFORMACIÓN =====
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5E4B8B',
  },
  infoContent: {
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  dismissButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  dismissButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },

  // ===== BOTONES DE ACCIÓN =====
  actionButtonsInline: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  resetAllButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#5E4B8B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  resetAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E4B8B',
  },
  saveChangesButton: {
    backgroundColor: '#5E4B8B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    flex: 2,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveChangesButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveChangesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },

  // ===== MODAL =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
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
    flex: 1,
    padding: 20,
    paddingTop: 16,
  },

  // ===== FORMULARIO DEL MODAL =====
  originalComparisonCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#6B7280',
  },
  originalComparisonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  originalComparisonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  numberInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
  },
  textAreaInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 80,
  },

  // ===== TOGGLE DE INTENSIDAD =====
  intensityToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  intensityButtonActive: {
    backgroundColor: '#5E4B8B',
  },
  intensityButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  intensityButtonTextActive: {
    color: 'white',
  },

  // ===== VISTA PREVIA =====
  previewCard: {
    backgroundColor: '#EDE9FE',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#5E4B8B',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5E4B8B',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5E4B8B',
    marginBottom: 4,
  },
  previewNotes: {
    fontSize: 14,
    color: '#7C3AED',
    fontStyle: 'italic',
  },

  // ===== ACCIONES DEL MODAL =====
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#5E4B8B',
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default CustomizeDayScreen;