package com.example.demo.repository;

import com.example.demo.model.MacrocycleDayCustomization;
import com.example.demo.model.Macrocycle;
import com.example.demo.model.ExerciseSet;
import com.example.demo.model.RoutineExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Repository para gestionar las customizaciones de días específicos en macrociclos.
 *
 * Funcionalidades principales:
 * - Obtener customizaciones por día específico
 * - Verificar qué días tienen customizaciones
 * - Borrar customizaciones (individual o masivamente)
 * - Buscar customizaciones específicas de series
 */
public interface MacrocycleDayCustomizationRepository extends JpaRepository<MacrocycleDayCustomization, Long> {

    // =========================================================================
    // CONSULTAS POR DÍA ESPECÍFICO
    // =========================================================================

    /**
     * Obtiene todas las customizaciones de un día específico del macrociclo.
     * Útil para mostrar la rutina completa de un día con sus modificaciones.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto (1, 2, 3...)
     * @return Lista de customizaciones para ese día
     */
    List<MacrocycleDayCustomization> findByMacrocycleAndAbsoluteDay(
            Macrocycle macrocycle,
            Integer absoluteDay
    );

    /**
     * Verifica si un día específico tiene al menos una customización.
     * Útil para marcar visualmente en el calendario qué días están modificados.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto
     * @return true si el día tiene customizaciones, false si no
     */
    boolean existsByMacrocycleAndAbsoluteDay(
            Macrocycle macrocycle,
            Integer absoluteDay
    );

    /**
     * Cuenta cuántas customizaciones tiene un día específico.
     * Útil para mostrar indicadores como "3 series modificadas".
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto
     * @return Número de customizaciones en ese día
     */
    long countByMacrocycleAndAbsoluteDay(
            Macrocycle macrocycle,
            Integer absoluteDay
    );

    // =========================================================================
    // CONSULTAS POR MACROCICLO COMPLETO
    // =========================================================================

    /**
     * Obtiene todas las customizaciones de un macrociclo.
     * Útil para auditoría o para operaciones masivas.
     *
     * @param macrocycle El macrociclo
     * @return Lista de todas las customizaciones del macrociclo
     */
    List<MacrocycleDayCustomization> findByMacrocycle(Macrocycle macrocycle);

    /**
     * Obtiene la lista de días que tienen customizaciones en un macrociclo.
     * Útil para marcar visualmente en el calendario qué días están modificados.
     *
     * @param macrocycle El macrociclo
     * @return Lista de días absolutos que tienen customizaciones
     */
    @Query("SELECT DISTINCT mdc.absoluteDay FROM MacrocycleDayCustomization mdc WHERE mdc.macrocycle = :macrocycle ORDER BY mdc.absoluteDay")
    List<Integer> findCustomizedDaysByMacrocycle(@Param("macrocycle") Macrocycle macrocycle);

    /**
     * Verifica si un macrociclo tiene al menos una customización.
     * Útil para mostrar indicadores generales como "Macrociclo personalizado".
     *
     * @param macrocycle El macrociclo
     * @return true si tiene customizaciones, false si no
     */
    boolean existsByMacrocycle(Macrocycle macrocycle);

    /**
     * Cuenta el total de customizaciones en un macrociclo.
     * Útil para estadísticas o limitar el número de modificaciones.
     *
     * @param macrocycle El macrociclo
     * @return Número total de customizaciones en el macrociclo
     */
    long countByMacrocycle(Macrocycle macrocycle);

    // =========================================================================
    // CONSULTAS POR SERIE ESPECÍFICA
    // =========================================================================

    /**
     * Busca la customización específica de una serie en un día determinado.
     * Útil para verificar si una serie específica está modificada.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto
     * @param exerciseSet La serie específica
     * @return Optional con la customización si existe
     */
    Optional<MacrocycleDayCustomization> findByMacrocycleAndAbsoluteDayAndExerciseSet(
            Macrocycle macrocycle,
            Integer absoluteDay,
            ExerciseSet exerciseSet
    );

    /**
     * Verifica si una serie específica está customizada en un día.
     * Útil para mostrar indicadores en la UI.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto
     * @param exerciseSet La serie específica
     * @return true si la serie está customizada, false si no
     */
    boolean existsByMacrocycleAndAbsoluteDayAndExerciseSet(
            Macrocycle macrocycle,
            Integer absoluteDay,
            ExerciseSet exerciseSet
    );

    /**
     * Obtiene todas las customizaciones de un ejercicio específico en un día.
     * Útil para mostrar todas las series modificadas de un ejercicio.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto
     * @param routineExercise El ejercicio específico
     * @return Lista de customizaciones para ese ejercicio en ese día
     */
    List<MacrocycleDayCustomization> findByMacrocycleAndAbsoluteDayAndRoutineExercise(
            Macrocycle macrocycle,
            Integer absoluteDay,
            RoutineExercise routineExercise
    );

    // =========================================================================
    // OPERACIONES DE BORRADO
    // =========================================================================

    /**
     * Borra todas las customizaciones de un macrociclo.
     * SE USA AUTOMÁTICAMENTE al desactivar el macrociclo.
     *
     * @param macrocycle El macrociclo cuyas customizaciones se borrarán
     */
    @Modifying
    @Transactional
    void deleteByMacrocycle(Macrocycle macrocycle);

    /**
     * Borra todas las customizaciones de un día específico.
     * Útil para "resetear día" en la UI.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto a resetear
     */
    @Modifying
    @Transactional
    void deleteByMacrocycleAndAbsoluteDay(Macrocycle macrocycle, Integer absoluteDay);

    /**
     * Borra la customización de una serie específica.
     * Útil para "resetear serie" en la UI.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto
     * @param exerciseSet La serie específica a resetear
     */
    @Modifying
    @Transactional
    void deleteByMacrocycleAndAbsoluteDayAndExerciseSet(
            Macrocycle macrocycle,
            Integer absoluteDay,
            ExerciseSet exerciseSet
    );

    /**
     * Borra todas las customizaciones de un ejercicio específico en un día.
     * Útil para "resetear ejercicio" en la UI.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto
     * @param routineExercise El ejercicio específico a resetear
     */
    @Modifying
    @Transactional
    void deleteByMacrocycleAndAbsoluteDayAndRoutineExercise(
            Macrocycle macrocycle,
            Integer absoluteDay,
            RoutineExercise routineExercise
    );

    // =========================================================================
    // CONSULTAS OPTIMIZADAS PARA RENDIMIENTO
    // =========================================================================

    /**
     * Obtiene customizaciones con información completa (JOIN) para evitar N+1 queries.
     * Útil para operaciones que necesitan datos de exerciseSet y routineExercise.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto
     * @return Lista de customizaciones con datos completos
     */
    @Query("SELECT mdc FROM MacrocycleDayCustomization mdc " +
            "JOIN FETCH mdc.exerciseSet es " +
            "JOIN FETCH mdc.routineExercise re " +
            "JOIN FETCH re.exercise e " +
            "WHERE mdc.macrocycle = :macrocycle AND mdc.absoluteDay = :absoluteDay " +
            "ORDER BY re.order, es.setNumber")
    List<MacrocycleDayCustomization> findByMacrocycleAndAbsoluteDayWithDetails(
            @Param("macrocycle") Macrocycle macrocycle,
            @Param("absoluteDay") Integer absoluteDay
    );

    /**
     * Obtiene días customizados con el conteo de modificaciones por día.
     * Útil para mostrar en el calendario cuántas modificaciones tiene cada día.
     *
     * @param macrocycle El macrociclo
     * @return Lista de objetos [día, conteo] ordenados por día
     */
    @Query("SELECT mdc.absoluteDay, COUNT(mdc) FROM MacrocycleDayCustomization mdc " +
            "WHERE mdc.macrocycle = :macrocycle " +
            "GROUP BY mdc.absoluteDay " +
            "ORDER BY mdc.absoluteDay")
    List<Object[]> findDayCustomizationCounts(@Param("macrocycle") Macrocycle macrocycle);
}