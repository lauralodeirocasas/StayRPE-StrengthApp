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

    // CAMBIO: De isActive a isArchived
    @Column(name = "is_archived")
    private boolean isArchived = false; // Por defecto NO archivado (activo)

    // Para indicar si es el macrociclo actualmente en uso
    @Column(name = "is_currently_active")
    private boolean isCurrentlyActive = false; // Solo uno puede estar activo a la vez

    // CAMPOS EXISTENTES
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

    // NUEVO: Método helper para verificar si está activo
    public boolean isActive() {
        return !isArchived;
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

    // Método para verificar si el macrociclo ha terminado
    public boolean isCompleted() {
        LocalDate endDate = getEndDate();
        if (endDate != null) {
            return LocalDate.now().isAfter(endDate);
        }
        return false;
    }

    // Método para verificar si el macrociclo está en progreso
    public boolean isInProgress() {
        if (startDate != null) {
            LocalDate today = LocalDate.now();
            LocalDate endDate = getEndDate();
            return !today.isBefore(startDate) && (endDate == null || !today.isAfter(endDate));
        }
        return false;
    }
}