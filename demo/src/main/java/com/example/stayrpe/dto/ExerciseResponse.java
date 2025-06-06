package com.example.stayrpe.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseResponse {
    private Long id;
    private String name;
    private String muscle;
    private String muscleGroup;
    private String description;
    private boolean isCustom;
    private String createdByUsername;
}