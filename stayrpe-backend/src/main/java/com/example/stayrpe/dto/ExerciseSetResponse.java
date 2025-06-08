package com.example.stayrpe.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseSetResponse {
    private Long id;
    private Integer setNumber;
    private Integer targetRepsMin;
    private Integer targetRepsMax;
    private Double targetWeight;
    private Integer rir;
    private Integer rpe;
    private String notes;
    // Campos de tracking
    private Integer actualReps;
    private Double actualWeight;
    private Integer actualRir;
    private Boolean completed;
}