// app/onboarding/fitness-goals.tsx

import { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import GradientButton from "../../components/GradientButton";

type Goal = "lose_weight" | "gain_muscle" | "improve_fitness" | "maintain";

export default function FitnessGoalsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{age: string; height: string; weight: string}>();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const goals = [
    { 
      id: "lose_weight", 
      label: "Perder peso", 
      description: "Reducir grasa corporal y mejorar composición corporal" 
    },
    { 
      id: "gain_muscle", 
      label: "Ganar músculo", 
      description: "Aumentar masa muscular y fuerza" 
    },
    { 
      id: "improve_fitness", 
      label: "Mejorar condición física", 
      description: "Incrementar resistencia, flexibilidad y rendimiento general" 
    },
    { 
      id: "maintain", 
      label: "Mantener estado actual", 
      description: "Conservar tu forma física y peso actuales" 
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Objetivos de Fitness</Text>
          
          <Text style={styles.description}>
            ¿Cuál es tu principal objetivo de fitness?
          </Text>

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
                <Text style={[styles.goalLabel, selectedGoal === goal.id && styles.selectedText]}>
                  {goal.label}
                </Text>
                <Text style={styles.goalDescription}>
                  {goal.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <GradientButton
            title="Continuar"
            onPress={handleContinue}
            disabled={!selectedGoal}
            style={[
              styles.button,
              { opacity: selectedGoal ? 1 : 0.5 }
            ]}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f1f1",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#34434D",
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },
  goalsContainer: {
    marginBottom: 30,
  },
  goalCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedGoal: {
    borderColor: "#3366cc",
    backgroundColor: "#e6efff",
  },
  goalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34434D",
    marginBottom: 5,
  },
  goalDescription: {
    fontSize: 14,
    color: "#666",
  },
  selectedText: {
    color: "#3366cc",
  },
  button: {
    width: "100%",
    marginTop: 20,
    marginBottom: 20,
  },
});