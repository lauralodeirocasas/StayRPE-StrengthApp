package com.example.stayrpe.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateExerciseSetDTO {
    private Integer setNumber;
    private Integer targetRepsMin;
    private Integer targetRepsMax;
    private Double targetWeight; // RM
    private Integer rir; // Reps in Reserve
    private Integer rpe; // Rate of Perceived Exertion
    private String notes;
}