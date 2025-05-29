// RoutineExerciseRepository.java
package com.example.demo.repository;

import com.example.demo.model.RoutineExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RoutineExerciseRepository extends JpaRepository<RoutineExercise, Long> {

    // Obtener ejercicios de una rutina ordenados
    @Query("SELECT re FROM RoutineExercise re WHERE re.routine.id = :routineId ORDER BY re.order ASC")
    List<RoutineExercise> findByRoutineIdOrderByOrder(@Param("routineId") Long routineId);

    // Eliminar todos los ejercicios de una rutina
    void deleteByRoutineId(Long routineId);
}