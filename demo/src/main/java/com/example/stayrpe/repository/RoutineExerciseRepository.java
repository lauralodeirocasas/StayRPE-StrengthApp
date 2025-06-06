// RoutineExerciseRepository.java
package com.example.stayrpe.repository;

import com.example.stayrpe.model.RoutineExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RoutineExerciseRepository extends JpaRepository<RoutineExercise, Long> {

    @Query("SELECT re FROM RoutineExercise re WHERE re.routine.id = :routineId ORDER BY re.order ASC")
    List<RoutineExercise> findByRoutineIdOrderByOrder(@Param("routineId") Long routineId);

    void deleteByRoutineId(Long routineId);
}