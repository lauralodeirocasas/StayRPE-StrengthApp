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
public class WorkoutHistorySet {
    private Integer setNumber;

    // Targets
    private Integer targetRepsMin;
    private Integer targetRepsMax;
    private Double targetWeight;
    private Integer targetRir;
    private Integer targetRpe;

    // Reales
    private Integer actualReps;
    private Double actualWeight;
    private Integer actualRir;
    private Integer actualRpe;
    private String actualNotes;
    private Boolean completed;
    private Boolean wasAddedDuringWorkout;

    // Calculados
    private Double volume; // actualReps × actualWeight
    private String performanceComparison; // Comparación con objetivo
}