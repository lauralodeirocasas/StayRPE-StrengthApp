package com.example.stayrpe.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "workout_session_exercises")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutSessionExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_session_id", nullable = false)
    private WorkoutSession workoutSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id")
    private Exercise exercise;

    @Column(name = "exercise_name", nullable = false)
    private String exerciseName;

    @Column(name = "exercise_muscle", nullable = false)
    private String exerciseMuscle;

    @Column(name = "exercise_order", nullable = false)
    private Integer exerciseOrder;

    @Column(name = "planned_sets", nullable = false)
    private Integer plannedSets;

    @Column(name = "completed_sets", nullable = false)
    private Integer completedSets;

    @Column(name = "rest_between_sets")
    private Integer restBetweenSets;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "was_added_during_workout")
    private Boolean wasAddedDuringWorkout = false;

    @Column(name = "total_volume")
    private Double totalVolume;

    @OneToMany(mappedBy = "workoutSessionExercise", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<WorkoutSessionSet> sets = new ArrayList<>();

    public void calculateTotalVolume() {
        if (sets != null && !sets.isEmpty()) {
            this.totalVolume = sets.stream()
                    .filter(set -> set.getActualReps() != null && set.getActualWeight() != null)
                    .mapToDouble(set -> set.getActualReps() * set.getActualWeight())
                    .sum();
        } else {
            this.totalVolume = 0.0;
        }
    }

    public boolean isFullyCompleted() {
        return completedSets != null && plannedSets != null &&
                completedSets.equals(plannedSets);
    }

    public int getCompletionPercentage() {
        if (plannedSets == null || plannedSets == 0) return 0;
        if (completedSets == null) return 0;
        return Math.round((completedSets * 100.0f) / plannedSets);
    }
}