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
public class CreateRoutineDTO {
    private String name;
    private String description;
    private List<CreateRoutineExerciseDTO> exercises;
}