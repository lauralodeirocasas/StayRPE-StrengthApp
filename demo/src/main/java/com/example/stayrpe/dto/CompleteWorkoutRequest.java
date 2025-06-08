package com.example.stayrpe.dto;

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

    private Long routineId;
    private String routineName;
    private String routineDescription;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String notes;
    private Long macrocycleId;
    private Integer absoluteDay;
    private List<CompletedExercise> exercises;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompletedExercise {
        private Long exerciseId;
        private String exerciseName;
        private String exerciseMuscle;
        private Integer exerciseOrder;
        private Integer restBetweenSets;
        private String notes;
        private Boolean wasAddedDuringWorkout;
        private List<CompletedSet> sets;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompletedSet {
        private Integer setNumber;
        private Integer targetRepsMin;
        private Integer targetRepsMax;
        private Double targetWeight;
        private Integer targetRir;
        private Integer targetRpe;
        private String targetNotes;
        private Integer actualReps;
        private Double actualWeight;
        private Integer actualRir;
        private Integer actualRpe;
        private String actualNotes;
        private Boolean completed;
        private Boolean wasAddedDuringWorkout;
    }

    public boolean belongsToMacrocycle() {
        return macrocycleId != null && absoluteDay != null;
    }

    public String getWorkoutType() {
        if (belongsToMacrocycle()) {
            return String.format("Día %d del macrociclo", absoluteDay);
        }
        return "Entrenamiento libre";
    }
}