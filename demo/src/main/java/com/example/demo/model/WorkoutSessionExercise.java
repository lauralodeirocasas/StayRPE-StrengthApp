package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;
import java.util.ArrayList;

/**
 * Ejercicio específico realizado en una sesión de entrenamiento.
 * Almacena la información del ejercicio tal como se realizó.
 */
@Entity
@Table(name = "workout_session_exercises")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutSessionExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Sesión de entrenamiento a la que pertenece este ejercicio
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_session_id", nullable = false)
    private WorkoutSession workoutSession;

    /**
     * Ejercicio base (puede ser null si se eliminó después)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id")
    private Exercise exercise;

    /**
     * Nombre del ejercicio en el momento del entrenamiento
     */
    @Column(name = "exercise_name", nullable = false)
    private String exerciseName;

    /**
     * Músculo trabajado
     */
    @Column(name = "exercise_muscle", nullable = false)
    private String exerciseMuscle;

    /**
     * Orden del ejercicio en la rutina (1, 2, 3...)
     */
    @Column(name = "exercise_order", nullable = false)
    private Integer exerciseOrder;

    /**
     * Número total de series planificadas para este ejercicio
     */
    @Column(name = "planned_sets", nullable = false)
    private Integer plannedSets;

    /**
     * Número de series completadas
     */
    @Column(name = "completed_sets", nullable = false)
    private Integer completedSets;

    /**
     * Tiempo de descanso entre series (en segundos)
     */
    @Column(name = "rest_between_sets")
    private Integer restBetweenSets;

    /**
     * Notas del ejercicio
     */
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /**
     * Si este ejercicio fue añadido durante el entrenamiento (no estaba en la rutina original)
     */
    @Column(name = "was_added_during_workout")
    private Boolean wasAddedDuringWorkout = false;

    /**
     * Volumen total de este ejercicio (suma de peso × reps de todas las series)
     */
    @Column(name = "total_volume")
    private Double totalVolume;

    /**
     * Series realizadas en este ejercicio
     * 🔥 FIX: Inicializar como ArrayList para evitar NullPointerException
     */
    @OneToMany(mappedBy = "workoutSessionExercise", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<WorkoutSessionSet> sets = new ArrayList<>();

    // =========================================================================
    // MÉTODOS DE UTILIDAD
    // =========================================================================

    /**
     * Calcula el volumen total del ejercicio
     */
    public void calculateTotalVolume() {
        if (sets != null && !sets.isEmpty()) {
            this.totalVolume = sets.stream()
                    .filter(set -> set.getActualReps() != null && set.getActualWeight() != null)
                    .mapToDouble(set -> set.getActualReps() * set.getActualWeight())
                    .sum();
        } else {
            this.totalVolume = 0.0;
        }
    }

    /**
     * Verifica si el ejercicio se completó totalmente
     */
    public boolean isFullyCompleted() {
        return completedSets != null && plannedSets != null &&
                completedSets.equals(plannedSets);
    }

    /**
     * Obtiene el porcentaje de completitud del ejercicio
     */
    public int getCompletionPercentage() {
        if (plannedSets == null || plannedSets == 0) return 0;
        if (completedSets == null) return 0;
        return Math.round((completedSets * 100.0f) / plannedSets);
    }
}