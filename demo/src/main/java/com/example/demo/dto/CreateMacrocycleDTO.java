package com.example.demo.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMacrocycleDTO {
    private String name;
    private String description;

    // NUEVOS CAMPOS
    private LocalDate startDate; // Día que empieza el macrociclo
    private Integer microcycleDurationDays; // Cuántos días dura cada microciclo
    private Integer totalMicrocycles; // Cuántos microciclos tendrá el macrociclo
}