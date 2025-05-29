package com.example.demo.repository;

import com.example.demo.model.ExerciseSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ExerciseSetRepository extends JpaRepository<ExerciseSet, Long> {

    // Obtener series de un ejercicio de rutina ordenadas
    @Query("SELECT es FROM ExerciseSet es WHERE es.routineExercise.id = :routineExerciseId ORDER BY es.setNumber ASC")
    List<ExerciseSet> findByRoutineExerciseIdOrderBySetNumber(@Param("routineExerciseId") Long routineExerciseId);

    // Eliminar todas las series de un ejercicio de rutina
    void deleteByRoutineExerciseId(Long routineExerciseId);
}