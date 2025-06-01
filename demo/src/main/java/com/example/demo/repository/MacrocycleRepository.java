package com.example.demo.repository;

import com.example.demo.model.Macrocycle;
import com.example.demo.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MacrocycleRepository extends JpaRepository<Macrocycle, Long> {

    // CAMBIO: De isActiveTrue a isArchivedFalse
    // Obtener macrociclos activos (no archivados) de un usuario
    List<Macrocycle> findByCreatedByAndIsArchivedFalse(Usuario usuario);

    // Obtener todos los macrociclos de un usuario (incluyendo archivados)
    List<Macrocycle> findByCreatedBy(Usuario usuario);

    // CAMBIO: Contar macrociclos activos (no archivados) de un usuario (para el límite de 3)
    int countByCreatedByAndIsArchivedFalse(Usuario usuario);

    // NUEVO: Obtener solo macrociclos archivados
    List<Macrocycle> findByCreatedByAndIsArchivedTrue(Usuario usuario);

    // MÉTODOS para manejo de macrociclo actualmente activo
    // Obtener el macrociclo actualmente activo de un usuario (debe estar no archivado y currently active)
    @Query("SELECT m FROM Macrocycle m WHERE m.createdBy = :usuario AND m.isCurrentlyActive = true AND m.isArchived = false")
    Optional<Macrocycle> findByCreatedByAndIsCurrentlyActiveTrue(@Param("usuario") Usuario usuario);

    // Verificar si un usuario tiene un macrociclo actualmente activo
    @Query("SELECT COUNT(m) > 0 FROM Macrocycle m WHERE m.createdBy = :usuario AND m.isCurrentlyActive = true AND m.isArchived = false")
    boolean existsByCreatedByAndIsCurrentlyActiveTrue(@Param("usuario") Usuario usuario);

    // Desactivar todos los macrociclos de un usuario (para que solo uno esté activo)
    @Modifying
    @Query("UPDATE Macrocycle m SET m.isCurrentlyActive = false WHERE m.createdBy = :usuario")
    void deactivateAllMacrocycles(@Param("usuario") Usuario usuario);

    // CAMBIO: Obtener macrociclos no archivados ordenados por si están actualmente activos primero
    @Query("SELECT m FROM Macrocycle m WHERE m.createdBy = :usuario AND m.isArchived = false ORDER BY m.isCurrentlyActive DESC, m.createdAt DESC")
    List<Macrocycle> findByCreatedByAndIsArchivedFalseOrderByCurrentlyActive(@Param("usuario") Usuario usuario);
}