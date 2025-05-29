package com.example.demo.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

// DTO para ejercicio dentro de rutina
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoutineExerciseDTO {
    private Long exerciseId;
    private Integer order;
    private Integer numberOfSets;
    private Integer restBetweenSets; // en segundos
    private String notes;
    private List<CreateExerciseSetDTO> sets;
}