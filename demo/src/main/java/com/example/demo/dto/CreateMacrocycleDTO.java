package com.example.demo.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMacrocycleDTO {
    private String name;
    private String description;
    private LocalDate startDate;
    private Integer microcycleDurationDays;
    private Integer totalMicrocycles;

    // NUEVO: Planificación simple
    private List<DayPlanDTO> dayPlans;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DayPlanDTO {
        private Integer dayNumber;
        private Long routineId; // null si es descanso
        private Boolean isRestDay;
    }
}