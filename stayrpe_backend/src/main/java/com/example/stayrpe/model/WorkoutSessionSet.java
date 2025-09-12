package com.example.stayrpe.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "workout_session_sets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutSessionSet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_session_exercise_id", nullable = false)
    private WorkoutSessionExercise workoutSessionExercise;

    @Column(name = "set_number", nullable = false)
    private Integer setNumber;

    @Column(name = "target_reps_min")
    private Integer targetRepsMin;

    @Column(name = "target_reps_max")
    private Integer targetRepsMax;

    @Column(name = "target_weight")
    private Double targetWeight;

    @Column(name = "target_rir")
    private Integer targetRir;

    @Column(name = "target_rpe")
    private Integer targetRpe;

    @Column(name = "target_notes", columnDefinition = "TEXT")
    private String targetNotes;

    @Column(name = "actual_reps")
    private Integer actualReps;

    @Column(name = "actual_weight")
    private Double actualWeight;

    @Column(name = "actual_rir")
    private Integer actualRir;

    @Column(name = "actual_rpe")
    private Integer actualRpe;

    @Column(name = "actual_notes", columnDefinition = "TEXT")
    private String actualNotes;

    @Column(name = "completed", nullable = false)
    private Boolean completed = false;

    @Column(name = "was_added_during_workout")
    private Boolean wasAddedDuringWorkout = false;

    public Double getVolume() {
        if (actualReps != null && actualWeight != null && completed) {
            return actualReps * actualWeight;
        }
        return 0.0;
    }

    public boolean metRepsTarget() {
        if (!completed || actualReps == null) return false;
        if (targetRepsMin == null && targetRepsMax == null) return true;

        int min = targetRepsMin != null ? targetRepsMin : 0;
        int max = targetRepsMax != null ? targetRepsMax : Integer.MAX_VALUE;

        return actualReps >= min && actualReps <= max;
    }

    public boolean metWeightTarget() {
        if (!completed || actualWeight == null || targetWeight == null) return false;
        return actualWeight >= targetWeight;
    }

    public String getDescription() {
        if (!completed) {
            return String.format("Serie %d - No completada", setNumber);
        }

        String desc = String.format("Serie %d: %d reps × %.1fkg",
                setNumber, actualReps, actualWeight);

        if (actualRir != null) {
            desc += String.format(" (%d RIR)", actualRir);
        } else if (actualRpe != null) {
            desc += String.format(" (@%d RPE)", actualRpe);
        }

        return desc;
    }

    public String getPerformanceComparison() {
        if (!completed) return "No completada";

        StringBuilder comparison = new StringBuilder();

        if (targetRepsMin != null && targetRepsMax != null && actualReps != null) {
            if (actualReps < targetRepsMin) {
                comparison.append("Reps: ").append(actualReps - targetRepsMin).append(" menos que objetivo");
            } else if (actualReps > targetRepsMax) {
                comparison.append("Reps: +").append(actualReps - targetRepsMax).append(" sobre objetivo");
            } else {
                comparison.append("Reps: En objetivo");
            }
        }

        if (targetWeight != null && actualWeight != null) {
            if (comparison.length() > 0) comparison.append(", ");
            double diff = actualWeight - targetWeight;
            if (Math.abs(diff) < 0.1) {
                comparison.append("Peso: En objetivo");
            } else if (diff > 0) {
                comparison.append("Peso: +").append(String.format("%.1f", diff)).append("kg");
            } else {
                comparison.append("Peso: ").append(String.format("%.1f", diff)).append("kg");
            }
        }

        return comparison.toString();
    }
}