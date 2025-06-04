package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompleteWorkoutRequest {

    /**
     * ID de la rutina base (puede ser null si no hay rutina asociada)
     */
    private Long routineId;

    /**
     * Nombre de la rutina en el momento del entrenamiento
     */
    private String routineName;

    /**
     * Descripción de la rutina
     */
    private String routineDescription;

    /**
     * Timestamp de inicio del entrenamiento
     */
    private LocalDateTime startedAt;

    /**
     * Timestamp de finalización del entrenamiento
     */
    private LocalDateTime completedAt;

    /**
     * Notas adicionales del entrenamiento
     */
    private String notes;

    /**
     * Lista de ejercicios realizados
     */
    private List<CompletedExercise> exercises;

    /**
     * Ejercicio completado en la sesión
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompletedExercise {
        private Long exerciseId; // ID del ejercicio base
        private String exerciseName;
        private String exerciseMuscle;
        private Integer exerciseOrder;
        private Integer restBetweenSets;
        private String notes;
        private Boolean wasAddedDuringWorkout; // Si fue añadido durante el entrenamiento
        private List<CompletedSet> sets;
    }

    /**
     * Serie completada en el ejercicio
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompletedSet {
        private Integer setNumber;

        // Valores planificados (targets)
        private Integer targetRepsMin;
        private Integer targetRepsMax;
        private Double targetWeight;
        private Integer targetRir;
        private Integer targetRpe;
        private String targetNotes;

        // Valores reales
        private Integer actualReps;
        private Double actualWeight;
        private Integer actualRir;
        private Integer actualRpe;
        private String actualNotes;
        private Boolean completed;
        private Boolean wasAddedDuringWorkout; // Si fue añadida durante el entrenamiento
    }
}