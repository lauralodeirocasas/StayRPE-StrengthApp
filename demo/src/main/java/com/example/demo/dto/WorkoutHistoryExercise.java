package com.example.demo.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutHistoryExercise {
    private String exerciseName;
    private String exerciseMuscle;
    private Integer exerciseOrder;
    private Integer plannedSets;
    private Integer completedSets;
    private Double totalVolume;
    private Boolean wasAddedDuringWorkout;

    /**
     * Lista de series (solo si se solicitan los detalles)
     */
    private List<WorkoutHistorySet> sets;
}