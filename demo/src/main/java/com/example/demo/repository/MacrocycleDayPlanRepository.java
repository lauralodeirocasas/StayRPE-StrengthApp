package com.example.demo.repository;

import com.example.demo.model.MacrocycleDayPlan;
import com.example.demo.model.Macrocycle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MacrocycleDayPlanRepository extends JpaRepository<MacrocycleDayPlan, Long> {

    List<MacrocycleDayPlan> findByMacrocycleOrderByDayNumber(Macrocycle macrocycle);

    void deleteByMacrocycle(Macrocycle macrocycle);
}