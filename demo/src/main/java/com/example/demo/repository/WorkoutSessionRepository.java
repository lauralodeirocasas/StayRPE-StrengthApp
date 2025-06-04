package com.example.demo.repository;

import com.example.demo.model.WorkoutSession;
import com.example.demo.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository para gestionar el historial de entrenamientos (WorkoutSession).
 */
public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, Long> {

    // =========================================================================
    // CONSULTAS BÁSICAS POR USUARIO
    // =========================================================================

    /**
     * Obtiene todas las sesiones de entrenamiento de un usuario, ordenadas por fecha (más recientes primero)
     */
    List<WorkoutSession> findByUserOrderByCompletedAtDesc(Usuario user);

    /**
     * Obtiene las últimas N sesiones de un usuario
     */
    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user ORDER BY ws.completedAt DESC")
    List<WorkoutSession> findTopNByUser(@Param("user") Usuario user, org.springframework.data.domain.Pageable pageable);

    /**
     * Cuenta el total de entrenamientos de un usuario
     */
    long countByUser(Usuario user);

    // =========================================================================
    // CONSULTAS POR RUTINA
    // =========================================================================

    /**
     * Obtiene todas las sesiones donde se usó una rutina específica
     */
    List<WorkoutSession> findByRoutineIdOrderByCompletedAtDesc(Long routineId);

    /**
     * Obtiene sesiones por nombre de rutina (útil si la rutina fue eliminada)
     */
    List<WorkoutSession> findByUserAndRoutineNameOrderByCompletedAtDesc(Usuario user, String routineName);

    /**
     * Cuenta cuántas veces un usuario ha hecho una rutina específica
     */
    long countByUserAndRoutineId(Usuario user, Long routineId);

    // =========================================================================
    // CONSULTAS POR FECHAS
    // =========================================================================

    /**
     * Obtiene entrenamientos en un rango de fechas
     */
    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.completedAt BETWEEN :startDate AND :endDate ORDER BY ws.completedAt DESC")
    List<WorkoutSession> findByUserAndDateRange(@Param("user") Usuario user,
                                                @Param("startDate") LocalDateTime startDate,
                                                @Param("endDate") LocalDateTime endDate);

    /**
     * Obtiene entrenamientos de hoy
     */
    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND DATE(ws.completedAt) = CURRENT_DATE ORDER BY ws.completedAt DESC")
    List<WorkoutSession> findTodayWorkouts(@Param("user") Usuario user);

    /**
     * Obtiene entrenamientos de esta semana
     */
    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.completedAt >= :startOfWeek ORDER BY ws.completedAt DESC")
    List<WorkoutSession> findThisWeekWorkouts(@Param("user") Usuario user, @Param("startOfWeek") LocalDateTime startOfWeek);

    /**
     * Obtiene entrenamientos de este mes
     */
    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.completedAt >= :startOfMonth ORDER BY ws.completedAt DESC")
    List<WorkoutSession> findThisMonthWorkouts(@Param("user") Usuario user, @Param("startOfMonth") LocalDateTime startOfMonth);

    // =========================================================================
    // ESTADÍSTICAS Y MÉTRICAS
    // =========================================================================

    /**
     * Obtiene el último entrenamiento de un usuario
     */
    Optional<WorkoutSession> findTopByUserOrderByCompletedAtDesc(Usuario user);

    /**
     * Calcula el volumen total levantado por un usuario
     */
    @Query("SELECT COALESCE(SUM(ws.totalVolume), 0) FROM WorkoutSession ws WHERE ws.user = :user")
    Double getTotalVolumeByUser(@Param("user") Usuario user);

    /**
     * Calcula el volumen total de esta semana
     */
    @Query("SELECT COALESCE(SUM(ws.totalVolume), 0) FROM WorkoutSession ws WHERE ws.user = :user AND ws.completedAt >= :startOfWeek")
    Double getThisWeekVolumeByUser(@Param("user") Usuario user, @Param("startOfWeek") LocalDateTime startOfWeek);

    /**
     * Obtiene la duración promedio de entrenamientos
     */
    @Query("SELECT AVG(ws.durationMinutes) FROM WorkoutSession ws WHERE ws.user = :user")
    Double getAverageWorkoutDuration(@Param("user") Usuario user);

    /**
     * Obtiene el porcentaje promedio de completitud
     */
    @Query("SELECT AVG(ws.completionPercentage) FROM WorkoutSession ws WHERE ws.user = :user")
    Double getAverageCompletionPercentage(@Param("user") Usuario user);

    /**
     * Cuenta entrenamientos completados al 100%
     */
    @Query("SELECT COUNT(ws) FROM WorkoutSession ws WHERE ws.user = :user AND ws.completionPercentage = 100")
    long countFullyCompletedWorkouts(@Param("user") Usuario user);

    // =========================================================================
    // CONSULTAS PARA ANÁLISIS DE PROGRESO
    // =========================================================================

    /**
     * Obtiene el historial de una rutina específica para análisis de progreso
     */
    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.routineName = :routineName ORDER BY ws.completedAt ASC")
    List<WorkoutSession> getProgressionByRoutineName(@Param("user") Usuario user, @Param("routineName") String routineName);

    /**
     * Obtiene entrenamientos agrupados por mes para estadísticas
     */
    @Query("SELECT YEAR(ws.completedAt), MONTH(ws.completedAt), COUNT(ws), AVG(ws.durationMinutes), SUM(ws.totalVolume) " +
            "FROM WorkoutSession ws WHERE ws.user = :user " +
            "GROUP BY YEAR(ws.completedAt), MONTH(ws.completedAt) " +
            "ORDER BY YEAR(ws.completedAt) DESC, MONTH(ws.completedAt) DESC")
    List<Object[]> getMonthlyStats(@Param("user") Usuario user);

    /**
     * Encuentra la racha actual de entrenamientos (días consecutivos)
     */
    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.completedAt >= :since ORDER BY ws.completedAt DESC")
    List<WorkoutSession> findWorkoutsForStreak(@Param("user") Usuario user, @Param("since") LocalDateTime since);

    // =========================================================================
    // CONSULTAS PARA DASHBOARD
    // =========================================================================

    /**
     * Obtiene estadísticas rápidas para el dashboard
     */
    @Query("SELECT " +
            "COUNT(ws), " +                           // total workouts
            "COALESCE(SUM(ws.totalVolume), 0), " +    // total volume
            "COALESCE(AVG(ws.durationMinutes), 0), " + // avg duration
            "COALESCE(AVG(ws.completionPercentage), 0) " + // avg completion
            "FROM WorkoutSession ws WHERE ws.user = :user")
    Object[] getDashboardStats(@Param("user") Usuario user);

    /**
     * Obtiene las rutinas más utilizadas
     */
    @Query("SELECT ws.routineName, COUNT(ws) FROM WorkoutSession ws WHERE ws.user = :user GROUP BY ws.routineName ORDER BY COUNT(ws) DESC")
    List<Object[]> getMostUsedRoutines(@Param("user") Usuario user);
}