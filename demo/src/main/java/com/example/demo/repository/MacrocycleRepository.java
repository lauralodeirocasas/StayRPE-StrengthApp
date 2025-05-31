package com.example.demo.repository;

import com.example.demo.model.Macrocycle;
import com.example.demo.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MacrocycleRepository extends JpaRepository<Macrocycle, Long> {

    // Obtener macrociclos activos de un usuario
    List<Macrocycle> findByCreatedByAndIsActiveTrue(Usuario usuario);

    // Obtener todos los macrociclos de un usuario (incluyendo archivados)
    List<Macrocycle> findByCreatedBy(Usuario usuario);

    // Contar macrociclos activos de un usuario (para el límite de 3)
    int countByCreatedByAndIsActiveTrue(Usuario usuario);
}