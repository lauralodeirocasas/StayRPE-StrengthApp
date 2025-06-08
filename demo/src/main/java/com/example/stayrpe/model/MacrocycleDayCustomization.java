package com.example.stayrpe.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "macrocycle_id", nullable = false)
    private Macrocycle macrocycle;

    @Column(name = "absolute_day", nullable = false)
    private Integer absoluteDay;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "routine_exercise_id", nullable = false)
    private RoutineExercise routineExercise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_set_id", nullable = false)
    private ExerciseSet exerciseSet;

    @Column(name = "custom_reps_min")
    private Integer customRepsMin;

    @Column(name = "custom_reps_max")
    private Integer customRepsMax;

    @Column(name = "custom_weight")
    private Double customWeight;

    @Column(name = "custom_rir")
    private Integer customRir;

    @Column(name = "custom_rpe")
    private Integer customRpe;

    @Column(name = "custom_notes", columnDefinition = "TEXT")
    private String customNotes;

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

    public boolean hasAnyCustomization() {
        return customRepsMin != null ||
                customRepsMax != null ||
                customWeight != null ||
                customRir != null ||
                customRpe != null ||
                (customNotes != null && !customNotes.trim().isEmpty());
    }

    public Integer getEffectiveRepsMin() {
        return customRepsMin != null ? customRepsMin : exerciseSet.getTargetRepsMin();
    }

    public Integer getEffectiveRepsMax() {
        return customRepsMax != null ? customRepsMax : exerciseSet.getTargetRepsMax();
    }

    public Double getEffectiveWeight() {
        return customWeight != null ? customWeight : exerciseSet.getTargetWeight();
    }

    public Integer getEffectiveRir() {
        return customRir != null ? customRir : exerciseSet.getRir();
    }

    public Integer getEffectiveRpe() {
        return customRpe != null ? customRpe : exerciseSet.getRpe();
    }

    public String getEffectiveNotes() {
        return (customNotes != null && !customNotes.trim().isEmpty()) ?
                customNotes : exerciseSet.getNotes();
    }
}