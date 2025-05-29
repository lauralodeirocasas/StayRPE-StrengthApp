package com.example.demo.model;

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
    private Routine routine; // Rutina a la que pertenece

    @ManyToOne
    @JoinColumn(name = "exercise_id", referencedColumnName = "id")
    private Exercise exercise; // Ejercicio seleccionado

    @Column(name = "exercise_order")
    private Integer order; // Orden del ejercicio en la rutina (1, 2, 3...)

    @Column(name = "number_of_sets")
    private Integer numberOfSets; // Número total de series para este ejercicio

    @Column(name = "rest_between_sets")
    private Integer restBetweenSets; // Descanso entre series en segundos (opcional)

    @Column(columnDefinition = "TEXT")
    private String notes; // Notas específicas para este ejercicio

    // Relación con las series individuales
    @OneToMany(mappedBy = "routineExercise", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ExerciseSet> sets;
}