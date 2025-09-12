package com.example.stayrpe.repository;

import com.example.stayrpe.model.WorkoutSession;
import com.example.stayrpe.model.Usuario;
import com.example.stayrpe.model.Macrocycle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, Long> {

    List<WorkoutSession> findByUserOrderByCompletedAtDesc(Usuario user);

    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user ORDER BY ws.completedAt DESC")
    List<WorkoutSession> findTopNByUser(@Param("user") Usuario user, org.springframework.data.domain.Pageable pageable);

    long countByUser(Usuario user);

    boolean existsByUserAndMacrocycleAndAbsoluteDay(Usuario user, Macrocycle macrocycle, Integer absoluteDay);

    Optional<WorkoutSession> findByUserAndMacrocycleAndAbsoluteDay(Usuario user, Macrocycle macrocycle, Integer absoluteDay);

    @Query("SELECT DISTINCT ws.absoluteDay FROM WorkoutSession ws WHERE ws.user = :user AND ws.macrocycle = :macrocycle AND ws.absoluteDay IS NOT NULL ORDER BY ws.absoluteDay")
    List<Integer> findCompletedAbsoluteDaysByUserAndMacrocycle(@Param("user") Usuario user, @Param("macrocycle") Macrocycle macrocycle);

    @Modifying
    @Transactional
    @Query("UPDATE WorkoutSession ws SET ws.macrocycle = null WHERE ws.user = :user AND ws.macrocycle = :macrocycle")
    void dissociateMacrocycleFromUserSessions(@Param("user") Usuario user, @Param("macrocycle") Macrocycle macrocycle);

    @Query("SELECT COUNT(ws) FROM WorkoutSession ws WHERE ws.macrocycle = :macrocycle")
    long countByMacrocycle(@Param("macrocycle") Macrocycle macrocycle);

    @Query("SELECT COUNT(ws) FROM WorkoutSession ws WHERE ws.user = :user AND ws.macrocycle = :macrocycle")
    long countByUserAndMacrocycle(@Param("user") Usuario user, @Param("macrocycle") Macrocycle macrocycle);

    List<WorkoutSession> findByRoutineIdOrderByCompletedAtDesc(Long routineId);

    List<WorkoutSession> findByUserAndRoutineNameOrderByCompletedAtDesc(Usuario user, String routineName);

    long countByUserAndRoutineId(Usuario user, Long routineId);

    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.completedAt BETWEEN :startDate AND :endDate ORDER BY ws.completedAt DESC")
    List<WorkoutSession> findByUserAndDateRange(@Param("user") Usuario user,
                                                @Param("startDate") LocalDateTime startDate,
                                                @Param("endDate") LocalDateTime endDate);

    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND DATE(ws.completedAt) = CURRENT_DATE ORDER BY ws.completedAt DESC")
    List<WorkoutSession> findTodayWorkouts(@Param("user") Usuario user);

    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.completedAt >= :startOfWeek ORDER BY ws.completedAt DESC")
    List<WorkoutSession> findThisWeekWorkouts(@Param("user") Usuario user, @Param("startOfWeek") LocalDateTime startOfWeek);

    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.completedAt >= :startOfMonth ORDER BY ws.completedAt DESC")
    List<WorkoutSession> findThisMonthWorkouts(@Param("user") Usuario user, @Param("startOfMonth") LocalDateTime startOfMonth);

    Optional<WorkoutSession> findTopByUserOrderByCompletedAtDesc(Usuario user);

    @Query("SELECT COALESCE(SUM(ws.totalVolume), 0) FROM WorkoutSession ws WHERE ws.user = :user")
    Double getTotalVolumeByUser(@Param("user") Usuario user);

    @Query("SELECT COALESCE(SUM(ws.totalVolume), 0) FROM WorkoutSession ws WHERE ws.user = :user AND ws.completedAt >= :startOfWeek")
    Double getThisWeekVolumeByUser(@Param("user") Usuario user, @Param("startOfWeek") LocalDateTime startOfWeek);

    @Query("SELECT AVG(ws.durationMinutes) FROM WorkoutSession ws WHERE ws.user = :user")
    Double getAverageWorkoutDuration(@Param("user") Usuario user);

    @Query("SELECT AVG(ws.completionPercentage) FROM WorkoutSession ws WHERE ws.user = :user")
    Double getAverageCompletionPercentage(@Param("user") Usuario user);

    @Query("SELECT COUNT(ws) FROM WorkoutSession ws WHERE ws.user = :user AND ws.completionPercentage = 100")
    long countFullyCompletedWorkouts(@Param("user") Usuario user);

    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.routineName = :routineName ORDER BY ws.completedAt ASC")
    List<WorkoutSession> getProgressionByRoutineName(@Param("user") Usuario user, @Param("routineName") String routineName);

    @Query("SELECT YEAR(ws.completedAt), MONTH(ws.completedAt), COUNT(ws), AVG(ws.durationMinutes), SUM(ws.totalVolume) " +
            "FROM WorkoutSession ws WHERE ws.user = :user " +
            "GROUP BY YEAR(ws.completedAt), MONTH(ws.completedAt) " +
            "ORDER BY YEAR(ws.completedAt) DESC, MONTH(ws.completedAt) DESC")
    List<Object[]> getMonthlyStats(@Param("user") Usuario user);

    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.completedAt >= :since ORDER BY ws.completedAt DESC")
    List<WorkoutSession> findWorkoutsForStreak(@Param("user") Usuario user, @Param("since") LocalDateTime since);

    @Query("SELECT " +
            "COUNT(ws), " +
            "COALESCE(SUM(ws.totalVolume), 0), " +
            "COALESCE(AVG(ws.durationMinutes), 0), " +
            "COALESCE(AVG(ws.completionPercentage), 0) " +
            "FROM WorkoutSession ws WHERE ws.user = :user")
    Object[] getDashboardStats(@Param("user") Usuario user);

    @Query("SELECT ws.routineName, COUNT(ws) FROM WorkoutSession ws WHERE ws.user = :user GROUP BY ws.routineName ORDER BY COUNT(ws) DESC")
    List<Object[]> getMostUsedRoutines(@Param("user") Usuario user);
}