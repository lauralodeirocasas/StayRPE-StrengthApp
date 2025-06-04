package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * Entidad para almacenar customizaciones temporales de días específicos en macrociclos activos.
 *
 * Esta tabla guarda SOLO las diferencias respecto a la rutina original.
 * Se borra automáticamente cuando se desactiva el macrociclo.
 *
 * Ejemplo de uso:
 * - Rutina original: Press banca 3×8-12×60kg
 * - Usuario modifica día 15, serie 2: 6-8×70kg
 * - Solo se guarda la diferencia en esta tabla
 * - El resto de días y series usan la rutina original
 */
@Entity
@Table(name = "macrocycle_day_customizations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MacrocycleDayCustomization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Macrociclo al que pertenece esta customización.
     * FK con CASCADE DELETE - se borra automáticamente al eliminar el macrociclo.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "macrocycle_id", nullable = false)
    private Macrocycle macrocycle;

    /**
     * Día absoluto del macrociclo (1, 2, 3... hasta el final).
     *
     * Ejemplo:
     * - Macrociclo de 4 semanas × 7 días = 84 días totales
     * - absolute_day puede ser cualquier valor entre 1 y 84
     * - El día 15 corresponde al día 1 del tercer microciclo
     */
    @Column(name = "absolute_day", nullable = false)
    private Integer absoluteDay;

    /**
     * Ejercicio específico dentro de la rutina que se está customizando.
     * FK con CASCADE DELETE - se borra si se elimina el ejercicio.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "routine_exercise_id", nullable = false)
    private RoutineExercise routineExercise;

    /**
     * Serie específica que se está customizando.
     * FK con CASCADE DELETE - se borra si se elimina la serie.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_set_id", nullable = false)
    private ExerciseSet exerciseSet;

    // =========================================================================
    // CAMPOS DE CUSTOMIZACIÓN
    // Solo se llenan los campos que el usuario efectivamente modificó
    // Si un campo es NULL, se usa el valor original de ExerciseSet
    // =========================================================================

    /**
     * Repeticiones mínimas personalizadas.
     * NULL = usar ExerciseSet.targetRepsMin original
     */
    @Column(name = "custom_reps_min")
    private Integer customRepsMin;

    /**
     * Repeticiones máximas personalizadas.
     * NULL = usar ExerciseSet.targetRepsMax original
     */
    @Column(name = "custom_reps_max")
    private Integer customRepsMax;

    /**
     * Peso personalizado en kilogramos.
     * NULL = usar ExerciseSet.targetWeight original
     */
    @Column(name = "custom_weight")
    private Double customWeight;

    /**
     * RIR (Reps in Reserve) personalizado.
     * NULL = usar ExerciseSet.rir original
     */
    @Column(name = "custom_rir")
    private Integer customRir;

    /**
     * RPE (Rate of Perceived Exertion) personalizado.
     * NULL = usar ExerciseSet.rpe original
     */
    @Column(name = "custom_rpe")
    private Integer customRpe;

    /**
     * Notas personalizadas para esta serie específica.
     * NULL = usar ExerciseSet.notes original
     */
    @Column(name = "custom_notes", columnDefinition = "TEXT")
    private String customNotes;

    // =========================================================================
    // CAMPOS DE AUDITORÍA
    // =========================================================================

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
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

    // =========================================================================
    // MÉTODOS DE UTILIDAD
    // =========================================================================

    /**
     * Verifica si esta customización tiene al menos un campo modificado.
     * @return true si hay al menos una customización, false si todos los campos son null
     */
    public boolean hasAnyCustomization() {
        return customRepsMin != null ||
                customRepsMax != null ||
                customWeight != null ||
                customRir != null ||
                customRpe != null ||
                (customNotes != null && !customNotes.trim().isEmpty());
    }

    /**
     * Obtiene las repeticiones mínimas efectivas (customizadas o originales).
     * @return customRepsMin si no es null, sino exerciseSet.targetRepsMin
     */
    public Integer getEffectiveRepsMin() {
        return customRepsMin != null ? customRepsMin : exerciseSet.getTargetRepsMin();
    }

    /**
     * Obtiene las repeticiones máximas efectivas (customizadas o originales).
     * @return customRepsMax si no es null, sino exerciseSet.targetRepsMax
     */
    public Integer getEffectiveRepsMax() {
        return customRepsMax != null ? customRepsMax : exerciseSet.getTargetRepsMax();
    }

    /**
     * Obtiene el peso efectivo (customizado o original).
     * @return customWeight si no es null, sino exerciseSet.targetWeight
     */
    public Double getEffectiveWeight() {
        return customWeight != null ? customWeight : exerciseSet.getTargetWeight();
    }

    /**
     * Obtiene el RIR efectivo (customizado o original).
     * @return customRir si no es null, sino exerciseSet.rir
     */
    public Integer getEffectiveRir() {
        return customRir != null ? customRir : exerciseSet.getRir();
    }

    /**
     * Obtiene el RPE efectivo (customizado o original).
     * @return customRpe si no es null, sino exerciseSet.rpe
     */
    public Integer getEffectiveRpe() {
        return customRpe != null ? customRpe : exerciseSet.getRpe();
    }

    /**
     * Obtiene las notas efectivas (customizadas o originales).
     * @return customNotes si no es null y no está vacío, sino exerciseSet.notes
     */
    public String getEffectiveNotes() {
        return (customNotes != null && !customNotes.trim().isEmpty()) ?
                customNotes : exerciseSet.getNotes();
    }
}