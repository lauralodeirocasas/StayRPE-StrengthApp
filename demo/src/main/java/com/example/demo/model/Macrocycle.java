package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "macrocycles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Macrocycle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // Nombre del macrociclo

    @Column(columnDefinition = "TEXT")
    private String description; // Descripción del macrociclo

    @ManyToOne
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    private Usuario createdBy; // Usuario que creó el macrociclo

    @Column(name = "is_active")
    private boolean isActive = true; // Si está activo o archivado

    // NUEVOS CAMPOS
    @Column(name = "start_date")
    private LocalDate startDate; // Día que empieza el macrociclo

    @Column(name = "microcycle_duration_days")
    private Integer microcycleDurationDays; // Cuántos días dura cada microciclo

    @Column(name = "total_microcycles")
    private Integer totalMicrocycles; // Cuántos microciclos tendrá el macrociclo

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Método helper para calcular la fecha de fin del macrociclo
    public LocalDate getEndDate() {
        if (startDate != null && microcycleDurationDays != null && totalMicrocycles != null) {
            int totalDays = microcycleDurationDays * totalMicrocycles;
            return startDate.plusDays(totalDays - 1);
        }
        return null;
    }

    // Método helper para calcular la duración total en días
    public Integer getTotalDurationDays() {
        if (microcycleDurationDays != null && totalMicrocycles != null) {
            return microcycleDurationDays * totalMicrocycles;
        }
        return null;
    }
}