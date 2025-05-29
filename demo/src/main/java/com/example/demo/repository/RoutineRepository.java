package com.example.demo.repository;

import com.example.demo.model.Routine;
import com.example.demo.model.RoutineExercise;
import com.example.demo.model.ExerciseSet;
import com.example.demo.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Repositorio para Rutinas
public interface RoutineRepository extends JpaRepository<Routine, Long> {

    // Obtener rutinas de un usuario específico
    List<Routine> findByCreatedByAndIsActiveTrue(Usuario usuario);

    // Obtener todas las rutinas de un usuario (incluyendo archivadas)
    List<Routine> findByCreatedBy(Usuario usuario);

    // Buscar rutinas por nombre
    List<Routine> findByCreatedByAndNameContainingIgnoreCaseAndIsActiveTrue(Usuario usuario, String name);

    // Contar rutinas activas de un usuario
    int countByCreatedByAndIsActiveTrue(Usuario usuario);
}

