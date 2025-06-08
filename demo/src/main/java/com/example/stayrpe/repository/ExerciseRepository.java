package com.example.stayrpe.repository;

import com.example.stayrpe.model.Exercise;
import com.example.stayrpe.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ExerciseRepository extends JpaRepository<Exercise, Long> {

    List<Exercise> findByMuscle(String muscle);

    List<Exercise> findByMuscleGroup(String muscleGroup);

    List<Exercise> findByIsCustomFalse();

    List<Exercise> findByIsCustomTrueAndCreatedBy(Usuario usuario);

    @Query("SELECT e FROM Exercise e WHERE e.isCustom = false OR (e.isCustom = true AND e.createdBy = :usuario)")
    List<Exercise> findAvailableExercisesForUser(@Param("usuario") Usuario usuario);

    List<Exercise> findByNameContainingIgnoreCase(String name);

    @Query("SELECT e FROM Exercise e WHERE (e.isCustom = false OR (e.isCustom = true AND e.createdBy = :usuario)) AND e.muscle = :muscle")
    List<Exercise> findByMuscleAndAvailableForUser(@Param("muscle") String muscle, @Param("usuario") Usuario usuario);
}