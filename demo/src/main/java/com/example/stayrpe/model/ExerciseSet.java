package com.example.stayrpe.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "exercise_sets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExerciseSet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "routine_exercise_id", referencedColumnName = "id")
    private RoutineExercise routineExercise;

    @Column(name = "set_number")
    private Integer setNumber;

    @Column(name = "target_reps_min")
    private Integer targetRepsMin;

    @Column(name = "target_reps_max")
    private Integer targetRepsMax;

    @Column(name = "target_weight")
    private Double targetWeight;

    @Column(name = "rir")
    private Integer rir;

    @Column(name = "rpe")
    private Integer rpe;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "actual_reps")
    private Integer actualReps;

    @Column(name = "actual_weight")
    private Double actualWeight;

    @Column(name = "actual_rir")
    private Integer actualRir;

    @Column(name = "completed")
    private Boolean completed = false;
}