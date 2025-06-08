package com.example.stayrpe.repository;

import com.example.stayrpe.model.MacrocycleDayCustomization;
import com.example.stayrpe.model.Macrocycle;
import com.example.stayrpe.model.ExerciseSet;
import com.example.stayrpe.model.RoutineExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface MacrocycleDayCustomizationRepository extends JpaRepository<MacrocycleDayCustomization, Long> {

    List<MacrocycleDayCustomization> findByMacrocycleAndAbsoluteDay(
            Macrocycle macrocycle,
            Integer absoluteDay
    );

    boolean existsByMacrocycleAndAbsoluteDay(
            Macrocycle macrocycle,
            Integer absoluteDay
    );

    long countByMacrocycleAndAbsoluteDay(
            Macrocycle macrocycle,
            Integer absoluteDay
    );

    List<MacrocycleDayCustomization> findByMacrocycle(Macrocycle macrocycle);

    @Query("SELECT DISTINCT mdc.absoluteDay FROM MacrocycleDayCustomization mdc WHERE mdc.macrocycle = :macrocycle ORDER BY mdc.absoluteDay")
    List<Integer> findCustomizedDaysByMacrocycle(@Param("macrocycle") Macrocycle macrocycle);

    boolean existsByMacrocycle(Macrocycle macrocycle);

    long countByMacrocycle(Macrocycle macrocycle);

    Optional<MacrocycleDayCustomization> findByMacrocycleAndAbsoluteDayAndExerciseSet(
            Macrocycle macrocycle,
            Integer absoluteDay,
            ExerciseSet exerciseSet
    );

    boolean existsByMacrocycleAndAbsoluteDayAndExerciseSet(
            Macrocycle macrocycle,
            Integer absoluteDay,
            ExerciseSet exerciseSet
    );

    List<MacrocycleDayCustomization> findByMacrocycleAndAbsoluteDayAndRoutineExercise(
            Macrocycle macrocycle,
            Integer absoluteDay,
            RoutineExercise routineExercise
    );

    @Modifying
    @Transactional
    void deleteByMacrocycle(Macrocycle macrocycle);

    @Modifying
    @Transactional
    void deleteByMacrocycleAndAbsoluteDay(Macrocycle macrocycle, Integer absoluteDay);

    @Modifying
    @Transactional
    void deleteByMacrocycleAndAbsoluteDayAndExerciseSet(
            Macrocycle macrocycle,
            Integer absoluteDay,
            ExerciseSet exerciseSet
    );

    @Modifying
    @Transactional
    void deleteByMacrocycleAndAbsoluteDayAndRoutineExercise(
            Macrocycle macrocycle,
            Integer absoluteDay,
            RoutineExercise routineExercise
    );

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

    @Query("SELECT mdc.absoluteDay, COUNT(mdc) FROM MacrocycleDayCustomization mdc " +
            "WHERE mdc.macrocycle = :macrocycle " +
            "GROUP BY mdc.absoluteDay " +
            "ORDER BY mdc.absoluteDay")
    List<Object[]> findDayCustomizationCounts(@Param("macrocycle") Macrocycle macrocycle);
}