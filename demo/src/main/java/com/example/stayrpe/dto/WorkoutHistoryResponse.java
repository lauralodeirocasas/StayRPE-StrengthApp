package com.example.stayrpe.dto;

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
    private String macrocycleName;
    private Integer absoluteDay;
    private List<WorkoutHistoryExercise> exercises;

    public boolean belongsToMacrocycle() {
        return macrocycleName != null && absoluteDay != null;
    }

    public String getWorkoutTypeDescription() {
        if (belongsToMacrocycle()) {
            return String.format("Día %d - %s", absoluteDay, macrocycleName);
        }
        return "Entrenamiento libre";
    }

    public String getWorkoutSummary() {
        StringBuilder summary = new StringBuilder();

        summary.append(routineName);

        if (belongsToMacrocycle()) {
            summary.append(String.format(" (Día %d)", absoluteDay));
        }

        summary.append(String.format(" - %d/%d series (%d%%) - %d min",
                completedSets, totalSets, completionPercentage, durationMinutes));

        if (totalVolume != null && totalVolume > 0) {
            summary.append(String.format(" - %.1fkg total", totalVolume));
        }

        return summary.toString();
    }
}