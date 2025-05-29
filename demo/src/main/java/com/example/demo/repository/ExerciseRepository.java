package com.example.demo.repository;

import com.example.demo.model.Exercise;
import com.example.demo.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ExerciseRepository extends JpaRepository<Exercise, Long> {

    // Obtener ejercicios por músculo específico
    List<Exercise> findByMuscle(String muscle);

    // Obtener ejercicios por grupo muscular
    List<Exercise> findByMuscleGroup(String muscleGroup);

    // Obtener solo ejercicios predefinidos
    List<Exercise> findByIsCustomFalse();

    // Obtener ejercicios personalizados de un usuario específico
    List<Exercise> findByIsCustomTrueAndCreatedBy(Usuario usuario);

    // Obtener todos los ejercicios disponibles para un usuario (predefinidos + sus personalizados)
    @Query("SELECT e FROM Exercise e WHERE e.isCustom = false OR (e.isCustom = true AND e.createdBy = :usuario)")
    List<Exercise> findAvailableExercisesForUser(@Param("usuario") Usuario usuario);

    // Buscar ejercicios por nombre (ignorando mayúsculas/minúsculas)
    List<Exercise> findByNameContainingIgnoreCase(String name);

    // Obtener ejercicios por músculo que estén disponibles para un usuario
    @Query("SELECT e FROM Exercise e WHERE (e.isCustom = false OR (e.isCustom = true AND e.createdBy = :usuario)) AND e.muscle = :muscle")
    List<Exercise> findByMuscleAndAvailableForUser(@Param("muscle") String muscle, @Param("usuario") Usuario usuario);
}