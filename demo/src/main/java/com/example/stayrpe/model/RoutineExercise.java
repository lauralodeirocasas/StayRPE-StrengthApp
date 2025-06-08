package com.example.stayrpe.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;

@Entity
@Table(name = "routine_exercises")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoutineExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "routine_id", referencedColumnName = "id")
    private Routine routine;

    @ManyToOne
    @JoinColumn(name = "exercise_id", referencedColumnName = "id")
    private Exercise exercise;

    @Column(name = "exercise_order")
    private Integer order;

    @Column(name = "number_of_sets")
    private Integer numberOfSets;

    @Column(name = "rest_between_sets")
    private Integer restBetweenSets;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "routineExercise", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ExerciseSet> sets;
}