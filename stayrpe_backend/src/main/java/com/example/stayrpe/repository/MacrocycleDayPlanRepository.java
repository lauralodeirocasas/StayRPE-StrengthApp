package com.example.stayrpe.repository;

import com.example.stayrpe.model.MacrocycleDayPlan;
import com.example.stayrpe.model.Macrocycle;
import com.example.stayrpe.model.Routine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MacrocycleDayPlanRepository extends JpaRepository<MacrocycleDayPlan, Long> {

    List<MacrocycleDayPlan> findByMacrocycleOrderByDayNumber(Macrocycle macrocycle);

    void deleteByMacrocycle(Macrocycle macrocycle);

    @Query("SELECT COUNT(mdp) FROM MacrocycleDayPlan mdp JOIN mdp.macrocycle m WHERE mdp.routine = :routine AND m.isArchived = false")
    long countByRoutineAndMacrocycleIsArchivedFalse(@Param("routine") Routine routine);

    @Query("SELECT DISTINCT m FROM MacrocycleDayPlan mdp JOIN mdp.macrocycle m WHERE mdp.routine = :routine AND m.isArchived = false")
    List<Macrocycle> findActiveMacrocyclesByRoutine(@Param("routine") Routine routine);

    @Query("SELECT COUNT(mdp) FROM MacrocycleDayPlan mdp WHERE mdp.routine = :routine")
    long countByRoutine(@Param("routine") Routine routine);
}