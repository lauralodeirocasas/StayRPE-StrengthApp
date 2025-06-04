package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

/**
 * Entidad para almacenar sesiones de entrenamiento completadas.
 * Cada vez que un usuario completa un workout, se crea un registro aquí.
 */
@Entity
@Table(name = "workout_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Usuario que realizó el entrenamiento
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Usuario user;

    /**
     * Rutina base que se utilizó (puede ser null si la rutina se eliminó después)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "routine_id")
    private Routine routine;

    /**
     * Nombre de la rutina en el momento del entrenamiento
     * (se guarda por si la rutina cambia o se elimina después)
     */
    @Column(name = "routine_name", nullable = false)
    private String routineName;

    /**
     * Descripción de la rutina en el momento del entrenamiento
     */
    @Column(name = "routine_description", columnDefinition = "TEXT")
    private String routineDescription;

    /**
     * Fecha y hora de inicio del entrenamiento
     */
    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    /**
     * Fecha y hora de finalización del entrenamiento
     */
    @Column(name = "completed_at", nullable = false)
    private LocalDateTime completedAt;

    /**
     * Duración total del entrenamiento en minutos
     */
    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    /**
     * Número total de ejercicios en la sesión
     */
    @Column(name = "total_exercises", nullable = false)
    private Integer totalExercises;

    /**
     * Número total de series planificadas
     */
    @Column(name = "total_sets", nullable = false)
    private Integer totalSets;

    /**
     * Número de series completadas
     */
    @Column(name = "completed_sets", nullable = false)
    private Integer completedSets;

    /**
     * Porcentaje de completitud (0-100)
     */
    @Column(name = "completion_percentage", nullable = false)
    private Integer completionPercentage;

    /**
     * Volumen total levantado (peso × reps de todas las series)
     */
    @Column(name = "total_volume")
    private Double totalVolume;

    /**
     * Notas adicionales del entrenamiento
     */
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /**
     * Ejercicios realizados en esta sesión
     * 🔥 FIX: Inicializar como ArrayList para evitar NullPointerException
     */
    @OneToMany(mappedBy = "workoutSession", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<WorkoutSessionExercise> exercises = new ArrayList<>();

    // =========================================================================
    // MÉTODOS DE UTILIDAD
    // =========================================================================

    /**
     * Calcula la duración en minutos entre inicio y fin
     */
    public void calculateDuration() {
        if (startedAt != null && completedAt != null) {
            long minutes = java.time.Duration.between(startedAt, completedAt).toMinutes();
            this.durationMinutes = (int) minutes;
        }
    }

    /**
     * Calcula el porcentaje de completitud
     */
    public void calculateCompletionPercentage() {
        if (totalSets != null && completedSets != null && totalSets > 0) {
            this.completionPercentage = Math.round((completedSets * 100.0f) / totalSets);
        } else {
            this.completionPercentage = 0;
        }
    }

    /**
     * Verifica si el entrenamiento se completó totalmente
     */
    public boolean isFullyCompleted() {
        return completionPercentage != null && completionPercentage == 100;
    }

    /**
     * Obtiene una descripción resumida del entrenamiento
     */
    public String getSummary() {
        return String.format("%s - %d/%d series (%d%%) - %d min",
                routineName, completedSets, totalSets, completionPercentage, durationMinutes);
    }
}