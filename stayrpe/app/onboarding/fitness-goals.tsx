import { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

type Goal = "lose_weight" | "gain_muscle" | "improve_fitness" | "maintain";

export default function FitnessGoalsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{age: string; height: string; weight: string; sex: string}>();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const goals = [
    { 
      id: "lose_weight", 
      label: "Perder grasa", 
      description: "Enfoque en reducir grasa corporal y mejorar definición",
      color: "#5E4B8B"
    },
    { 
      id: "gain_muscle", 
      label: "Ganar músculo", 
      description: "Priorizar el crecimiento muscular y aumento de masa",
      icon: "fitness",
      color: "#5E4B8B"
    },
    { 
      id: "improve_fitness", 
      label: "Ganar fuerza", 
      description: "Incrementar la fuerza máxima y capacidad de carga",
      icon: "barbell",
      color: "#5E4B8B"
    },
    { 
      id: "maintain", 
      label: "Mantener forma", 
      description: "Conservar el nivel actual de forma física y rendimiento",
      icon: "pause",
      color: "#5E4B8B"
    },
  ];

  const handleContinue = () => {
    if (selectedGoal) {
      router.push({
        pathname: "/onboarding/experience-level",
        params: { 
          ...params,
          goal: selectedGoal 
        }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Objetivo Principal</Text>
            <Text style={styles.headerSubtitle}>
              ¿En qué te quieres enfocar?
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '66%' }]} />
            </View>
            <Text style={styles.progressText}>2 de 3</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <View style={styles.goalsContainer}>
            {goals.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalCard,
                  selectedGoal === goal.id && styles.selectedGoal,
                ]}
                onPress={() => setSelectedGoal(goal.id as Goal)}
                activeOpacity={0.7}
              >
                <View style={styles.goalContent}>
                  <Text style={[
                    styles.goalLabel, 
                    selectedGoal === goal.id && styles.selectedText
                  ]}>
                    {goal.label}
                  </Text>
                  <Text style={[
                    styles.goalDescription, 
                    selectedGoal === goal.id && styles.selectedDescriptionText
                  ]}>
                    {goal.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { opacity: selectedGoal ? 1 : 0.6 }
          ]}
          onPress={handleContinue}
          disabled={!selectedGoal}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    backgroundColor: '#FFFFFF',
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
  progressContainer: {
    alignItems: 'flex-end',
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: '#EDE9FE',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5E4B8B',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  goalsContainer: {
    gap: 16,
  },
  goalCard: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedGoal: {
    backgroundColor: '#5E4B8B',
    borderColor: '#5936A2',
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  goalContent: {
    gap: 8,
  },
  goalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  goalDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  selectedText: {
    color: '#FFFFFF',
  },
  selectedDescriptionText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5E4B8B',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#5E4B8B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
});