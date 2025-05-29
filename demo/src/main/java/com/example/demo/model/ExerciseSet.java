package com.example.demo.model;

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
    private RoutineExercise routineExercise; // Ejercicio de rutina al que pertenece

    @Column(name = "set_number")
    private Integer setNumber; // Número de la serie (1, 2, 3...)

    @Column(name = "target_reps_min")
    private Integer targetRepsMin; // Rango mínimo de repeticiones

    @Column(name = "target_reps_max")
    private Integer targetRepsMax; // Rango máximo de repeticiones

    @Column(name = "target_weight")
    private Double targetWeight; // Peso objetivo (RM - Repetición Máxima)

    @Column(name = "rir")
    private Integer rir; // RIR (Reps in Reserve) - repeticiones en reserva

    @Column(name = "rpe")
    private Integer rpe; // RPE (Rate of Perceived Exertion) - esfuerzo percibido (1-10)

    @Column(columnDefinition = "TEXT")
    private String notes; // Notas específicas para esta serie

    // Campos para tracking (cuando se ejecute la rutina)
    @Column(name = "actual_reps")
    private Integer actualReps; // Repeticiones realmente realizadas

    @Column(name = "actual_weight")
    private Double actualWeight; // Peso realmente usado

    @Column(name = "actual_rir")
    private Integer actualRir; // RIR real reportado

    @Column(name = "completed")
    private Boolean completed = false; // Si la serie fue completada
}