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
public class WorkoutStatsResponse {

    // Estadísticas generales
    private Long totalWorkouts;
    private Double totalVolume;
    private Double averageDuration;
    private Double averageCompletionPercentage;
    private Long fullyCompletedWorkouts;

    // Esta semana
    private Long thisWeekWorkouts;
    private Double thisWeekVolume;

    // Último entrenamiento
    private LocalDateTime lastWorkoutDate;
    private String lastWorkoutRoutine;

    // Rutinas más usadas
    private List<RoutineUsageStats> mostUsedRoutines;

    // Estadísticas mensuales
    private List<MonthlyStats> monthlyProgress;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoutineUsageStats {
        private String routineName;
        private Long timesCompleted;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyStats {
        private Integer year;
        private Integer month;
        private String monthName;
        private Long workoutsCount;
        private Double averageDuration;
        private Double totalVolume;
    }
}