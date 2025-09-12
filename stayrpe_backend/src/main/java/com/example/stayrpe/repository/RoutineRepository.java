package com.example.stayrpe.repository;

import com.example.stayrpe.model.Routine;
import com.example.stayrpe.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoutineRepository extends JpaRepository<Routine, Long> {

    List<Routine> findByCreatedByAndIsActiveTrue(Usuario usuario);

    List<Routine> findByCreatedBy(Usuario usuario);

    List<Routine> findByCreatedByAndNameContainingIgnoreCaseAndIsActiveTrue(Usuario usuario, String name);

    int countByCreatedByAndIsActiveTrue(Usuario usuario);

    boolean existsByCreatedByAndNameIgnoreCaseAndIsActiveTrue(Usuario usuario, String name);
}