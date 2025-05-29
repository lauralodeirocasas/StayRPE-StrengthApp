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
public class RoutineExerciseResponse {
    private Long id;
    private Long exerciseId;
    private String exerciseName;
    private String exerciseMuscle;
    private Integer order;
    private Integer numberOfSets;
    private Integer restBetweenSets;
    private String notes;
    private List<ExerciseSetResponse> sets;
}