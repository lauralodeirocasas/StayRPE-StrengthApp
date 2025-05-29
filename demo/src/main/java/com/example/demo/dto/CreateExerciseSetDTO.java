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
public class CreateExerciseSetDTO {
    private Integer setNumber;
    private Integer targetRepsMin;
    private Integer targetRepsMax;
    private Double targetWeight; // RM
    private Integer rir; // Reps in Reserve
    private Integer rpe; // Rate of Perceived Exertion
    private String notes;
}