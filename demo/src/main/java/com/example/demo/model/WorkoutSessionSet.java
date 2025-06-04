package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

/**
 * Serie específica realizada en una sesión de entrenamiento.
 * Almacena tanto los valores planificados como los realmente ejecutados.
 */
@Entity
@Table(name = "workout_session_sets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutSessionSet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Ejercicio de la sesión al que pertenece esta serie
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_session_exercise_id", nullable = false)
    private WorkoutSessionExercise workoutSessionExercise;

    /**
     * Número de la serie (1, 2, 3...)
     */
    @Column(name = "set_number", nullable = false)
    private Integer setNumber;

    // =========================================================================
    // VALORES PLANIFICADOS (de la rutina original)
    // =========================================================================

    /**
     * Repeticiones mínimas planificadas
     */
    @Column(name = "target_reps_min")
    private Integer targetRepsMin;

    /**
     * Repeticiones máximas planificadas
     */
    @Column(name = "target_reps_max")
    private Integer targetRepsMax;

    /**
     * Peso planificado
     */
    @Column(name = "target_weight")
    private Double targetWeight;

    /**
     * RIR planificado
     */
    @Column(name = "target_rir")
    private Integer targetRir;

    /**
     * RPE planificado
     */
    @Column(name = "target_rpe")
    private Integer targetRpe;

    /**
     * Notas planificadas
     */
    @Column(name = "target_notes", columnDefinition = "TEXT")
    private String targetNotes;

    // =========================================================================
    // VALORES REALES (lo que realmente se hizo)
    // =========================================================================

    /**
     * Repeticiones realmente realizadas
     */
    @Column(name = "actual_reps")
    private Integer actualReps;

    /**
     * Peso realmente utilizado
     */
    @Column(name = "actual_weight")
    private Double actualWeight;

    /**
     * RIR real reportado por el usuario
     */
    @Column(name = "actual_rir")
    private Integer actualRir;

    /**
     * RPE real reportado por el usuario
     */
    @Column(name = "actual_rpe")
    private Integer actualRpe;

    /**
     * Notas adicionales de la serie
     */
    @Column(name = "actual_notes", columnDefinition = "TEXT")
    private String actualNotes;

    /**
     * Si la serie fue completada
     */
    @Column(name = "completed", nullable = false)
    private Boolean completed = false;

    /**
     * Si esta serie fue añadida durante el entrenamiento
     */
    @Column(name = "was_added_during_workout")
    private Boolean wasAddedDuringWorkout = false;

    // =========================================================================
    // MÉTODOS DE UTILIDAD
    // =========================================================================

    /**
     * Calcula el volumen de esta serie (peso × repeticiones)
     */
    public Double getVolume() {
        if (actualReps != null && actualWeight != null && completed) {
            return actualReps * actualWeight;
        }
        return 0.0;
    }

    /**
     * Verifica si se cumplió el objetivo de repeticiones
     */
    public boolean metRepsTarget() {
        if (!completed || actualReps == null) return false;
        if (targetRepsMin == null && targetRepsMax == null) return true;

        int min = targetRepsMin != null ? targetRepsMin : 0;
        int max = targetRepsMax != null ? targetRepsMax : Integer.MAX_VALUE;

        return actualReps >= min && actualReps <= max;
    }

    /**
     * Verifica si se cumplió el objetivo de peso
     */
    public boolean metWeightTarget() {
        if (!completed || actualWeight == null || targetWeight == null) return false;
        return actualWeight >= targetWeight;
    }

    /**
     * Obtiene una descripción de la serie
     */
    public String getDescription() {
        if (!completed) {
            return String.format("Serie %d - No completada", setNumber);
        }

        String desc = String.format("Serie %d: %d reps × %.1fkg",
                setNumber, actualReps, actualWeight);

        if (actualRir != null) {
            desc += String.format(" (%d RIR)", actualRir);
        } else if (actualRpe != null) {
            desc += String.format(" (@%d RPE)", actualRpe);
        }

        return desc;
    }

    /**
     * Compara el rendimiento vs objetivo
     */
    public String getPerformanceComparison() {
        if (!completed) return "No completada";

        StringBuilder comparison = new StringBuilder();

        // Comparar repeticiones
        if (targetRepsMin != null && targetRepsMax != null && actualReps != null) {
            if (actualReps < targetRepsMin) {
                comparison.append("Reps: ").append(actualReps - targetRepsMin).append(" menos que objetivo");
            } else if (actualReps > targetRepsMax) {
                comparison.append("Reps: +").append(actualReps - targetRepsMax).append(" sobre objetivo");
            } else {
                comparison.append("Reps: En objetivo");
            }
        }

        // Comparar peso
        if (targetWeight != null && actualWeight != null) {
            if (comparison.length() > 0) comparison.append(", ");
            double diff = actualWeight - targetWeight;
            if (Math.abs(diff) < 0.1) {
                comparison.append("Peso: En objetivo");
            } else if (diff > 0) {
                comparison.append("Peso: +").append(String.format("%.1f", diff)).append("kg");
            } else {
                comparison.append("Peso: ").append(String.format("%.1f", diff)).append("kg");
            }
        }

        return comparison.toString();
    }
}