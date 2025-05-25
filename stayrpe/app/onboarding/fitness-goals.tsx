import { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

type Goal = "lose_weight" | "gain_muscle" | "improve_fitness" | "maintain";

export default function FitnessGoalsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{age: string; height: string; weight: string; sex: string}>();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const goals = [
    { 
      id: "lose_weight", 
      label: "Perder grasa", 
      description: "Reducir grasa corporal y mejorar composición corporal" 
    },
    { 
      id: "gain_muscle", 
      label: "Ganar músculo", 
      description: "Aumentar masa muscular y llevar tu físico a otro nivel" 
    },
    { 
      id: "improve_fitness", 
      label: "Ganar fuerza", 
      description: "Incrementar tu fuerza y levantar más peso" 
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
    <SafeAreaView style={fitnessStyles.container}>
      <ScrollView contentContainerStyle={fitnessStyles.scrollContent}>
        <View style={fitnessStyles.content}>
          <Text style={fitnessStyles.title}>Seleccione su principal objetivo</Text>
          
          <Text style={fitnessStyles.description}>
            ¿Cuál es tu principal objetivo  fitness?
          </Text>

          <View style={fitnessStyles.goalsContainer}>
            {goals.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={[
                  fitnessStyles.goalCard,
                  selectedGoal === goal.id && fitnessStyles.selectedGoal,
                ]}
                onPress={() => setSelectedGoal(goal.id as Goal)}
                activeOpacity={0.7}
              >
                <Text style={[fitnessStyles.goalLabel, selectedGoal === goal.id && fitnessStyles.selectedText]}>
                  {goal.label}
                </Text>
                <Text style={[fitnessStyles.goalDescription, selectedGoal === goal.id && fitnessStyles.selectedDescriptionText]}>
                  {goal.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              fitnessStyles.button,
              { opacity: selectedGoal ? 1 : 0.5 }
            ]}
            onPress={handleContinue}
            disabled={!selectedGoal}
            activeOpacity={0.8}
          >
            <Text style={fitnessStyles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const fitnessStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f5fc",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#5E4B8B",
    marginTop: 20,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#7D7A8C",
    marginBottom: 30,
  },
  goalsContainer: {
    marginBottom: 30,
  },
  goalCard: {
    backgroundColor: "#F3F0FF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: "#DCD6F7",
    shadowColor: "#B793F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedGoal: {
    backgroundColor: "#5E4B8B",
    borderColor: "#5936A2",
    shadowColor: "#5936A2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  goalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5E4B8B",
    marginBottom: 8,
  },
  goalDescription: {
    fontSize: 14,
    color: "#7D7A8C",
    lineHeight: 20,
  },
  selectedText: {
    color: "#fff9db",
  },
  selectedDescriptionText: {
    color: "#E6E1FF",
  },
  button: {
    width: "100%",
    backgroundColor: "#5E4B8B",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#8B63D7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff9db",
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: 1,
  },
});