package com.example.stayrpe.repository;

import com.example.stayrpe.model.ExerciseSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ExerciseSetRepository extends JpaRepository<ExerciseSet, Long> {

    @Query("SELECT es FROM ExerciseSet es WHERE es.routineExercise.id = :routineExerciseId ORDER BY es.setNumber ASC")
    List<ExerciseSet> findByRoutineExerciseIdOrderBySetNumber(@Param("routineExerciseId") Long routineExerciseId);

    void deleteByRoutineExerciseId(Long routineExerciseId);
}