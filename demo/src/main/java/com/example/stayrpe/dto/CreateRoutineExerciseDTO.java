package com.example.stayrpe.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;


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