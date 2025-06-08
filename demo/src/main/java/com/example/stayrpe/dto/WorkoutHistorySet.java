package com.example.stayrpe.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutHistorySet {
    private Integer setNumber;
    private Integer targetRepsMin;
    private Integer targetRepsMax;
    private Double targetWeight;
    private Integer targetRir;
    private Integer targetRpe;
    private Integer actualReps;
    private Double actualWeight;
    private Integer actualRir;
    private Integer actualRpe;
    private String actualNotes;
    private Boolean completed;
    private Boolean wasAddedDuringWorkout;
    private Double volume;
    private String performanceComparison;
}