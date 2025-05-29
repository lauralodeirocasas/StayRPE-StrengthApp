package com.example.demo.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

// DTO para crear/actualizar rutina
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoutineDTO {
    private String name;
    private String description;
    private List<CreateRoutineExerciseDTO> exercises;
}