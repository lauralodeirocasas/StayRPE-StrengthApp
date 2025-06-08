package com.example.stayrpe.repository;

import com.example.stayrpe.model.Macrocycle;
import com.example.stayrpe.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MacrocycleRepository extends JpaRepository<Macrocycle, Long> {

    List<Macrocycle> findByCreatedByAndIsArchivedFalse(Usuario usuario);

    List<Macrocycle> findByCreatedBy(Usuario usuario);

    int countByCreatedByAndIsArchivedFalse(Usuario usuario);

    List<Macrocycle> findByCreatedByAndIsArchivedTrue(Usuario usuario);

    @Query("SELECT m FROM Macrocycle m WHERE m.createdBy = :usuario AND m.isCurrentlyActive = true AND m.isArchived = false")
    Optional<Macrocycle> findByCreatedByAndIsCurrentlyActiveTrue(@Param("usuario") Usuario usuario);

    @Query("SELECT COUNT(m) > 0 FROM Macrocycle m WHERE m.createdBy = :usuario AND m.isCurrentlyActive = true AND m.isArchived = false")
    boolean existsByCreatedByAndIsCurrentlyActiveTrue(@Param("usuario") Usuario usuario);

    @Modifying
    @Query("UPDATE Macrocycle m SET m.isCurrentlyActive = false WHERE m.createdBy = :usuario")
    void deactivateAllMacrocycles(@Param("usuario") Usuario usuario);

    @Query("SELECT m FROM Macrocycle m WHERE m.createdBy = :usuario AND m.isArchived = false ORDER BY m.isCurrentlyActive DESC, m.createdAt DESC")
    List<Macrocycle> findByCreatedByAndIsArchivedFalseOrderByCurrentlyActive(@Param("usuario") Usuario usuario);

    boolean existsByCreatedByAndNameIgnoreCase(Usuario usuario, String name);
}