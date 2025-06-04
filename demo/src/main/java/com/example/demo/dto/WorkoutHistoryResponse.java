
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
public class WorkoutHistoryResponse {
    private Long id;
    private String routineName;
    private String routineDescription;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Integer durationMinutes;
    private Integer totalExercises;
    private Integer totalSets;
    private Integer completedSets;
    private Integer completionPercentage;
    private Double totalVolume;
    private String notes;

    /**
     * Lista de ejercicios (solo si se solicitan los detalles)
     */
    private List<WorkoutHistoryExercise> exercises;
}