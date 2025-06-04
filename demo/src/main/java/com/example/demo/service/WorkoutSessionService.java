package com.example.demo.service;

import com.example.demo.dto.*;
import com.example.demo.model.*;
import com.example.demo.repository.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Servicio para gestionar el historial de entrenamientos.
 */
@Service
@Transactional
public class WorkoutSessionService {

    private static final Logger logger = LoggerFactory.getLogger(WorkoutSessionService.class);

    private final WorkoutSessionRepository workoutSessionRepository;
    private final RoutineRepository routineRepository;
    private final ExerciseRepository exerciseRepository;

    public WorkoutSessionService(
            WorkoutSessionRepository workoutSessionRepository,
            RoutineRepository routineRepository,
            ExerciseRepository exerciseRepository
    ) {
        this.workoutSessionRepository = workoutSessionRepository;
        this.routineRepository = routineRepository;
        this.exerciseRepository = exerciseRepository;
    }

    // =========================================================================
    // MÉTODOS PRINCIPALES
    // =========================================================================

    /**
     * Guarda un entrenamiento completado en el historial.
     */
    public WorkoutSession saveCompletedWorkout(Usuario user, CompleteWorkoutRequest request) {
        logger.info("Guardando entrenamiento completado para usuario: {}", user.getUsername());

        // Validar la request
        validateCompleteWorkoutRequest(request);

        // Buscar la rutina si existe
        Routine routine = null;
        if (request.getRoutineId() != null) {
            routine = routineRepository.findById(request.getRoutineId()).orElse(null);
        }

        // Crear la sesión principal
        WorkoutSession session = WorkoutSession.builder()
                .user(user)
                .routine(routine)
                .routineName(request.getRoutineName())
                .routineDescription(request.getRoutineDescription())
                .startedAt(request.getStartedAt())
                .completedAt(request.getCompletedAt())
                .totalExercises(request.getExercises().size())
                .notes(request.getNotes())
                .build();

        // Calcular estadísticas
        calculateSessionStats(session, request);

        // Guardar la sesión
        WorkoutSession savedSession = workoutSessionRepository.save(session);

        // Crear los ejercicios y series
        createSessionExercises(savedSession, request.getExercises());

        // Recalcular volumen total
        recalculateSessionVolume(savedSession);

        logger.info("Entrenamiento guardado con ID: {} - {} ejercicios, {} series completadas",
                savedSession.getId(), savedSession.getTotalExercises(), savedSession.getCompletedSets());

        return savedSession;
    }

    /**
     * Obtiene el historial de entrenamientos de un usuario.
     */
    public List<WorkoutHistoryResponse> getWorkoutHistory(Usuario user, int limit) {
        logger.info("Obteniendo historial de entrenamientos para usuario: {} (límite: {})",
                user.getUsername(), limit);

        List<WorkoutSession> sessions;
        if (limit > 0) {
            sessions = workoutSessionRepository.findTopNByUser(user,
                    org.springframework.data.domain.PageRequest.of(0, limit));
        } else {
            sessions = workoutSessionRepository.findByUserOrderByCompletedAtDesc(user);
        }

        return sessions.stream()
                .map(this::convertToHistoryResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene los detalles completos de una sesión específica.
     */
    public Optional<WorkoutHistoryResponse> getWorkoutDetails(Usuario user, Long sessionId) {
        logger.info("Obteniendo detalles de sesión {} para usuario: {}", sessionId, user.getUsername());

        Optional<WorkoutSession> sessionOpt = workoutSessionRepository.findById(sessionId);

        if (sessionOpt.isEmpty()) {
            return Optional.empty();
        }

        WorkoutSession session = sessionOpt.get();

        // Verificar que la sesión pertenece al usuario
        if (!session.getUser().getId().equals(user.getId())) {
            logger.warn("Usuario {} intentó acceder a sesión {} que no le pertenece",
                    user.getUsername(), sessionId);
            return Optional.empty();
        }

        return Optional.of(convertToHistoryResponseWithDetails(session));
    }

    /**
     * Obtiene estadísticas generales del usuario.
     */
    public WorkoutStatsResponse getWorkoutStats(Usuario user) {
        logger.info("Obteniendo estadísticas de entrenamientos para usuario: {}", user.getUsername());

        // Estadísticas básicas
        Object[] dashboardStats = workoutSessionRepository.getDashboardStats(user);
        Long totalWorkouts = ((Number) dashboardStats[0]).longValue();
        Double totalVolume = ((Number) dashboardStats[1]).doubleValue();
        Double avgDuration = ((Number) dashboardStats[2]).doubleValue();
        Double avgCompletion = ((Number) dashboardStats[3]).doubleValue();

        // Estadísticas adicionales
        Long fullyCompleted = workoutSessionRepository.countFullyCompletedWorkouts(user);

        // Esta semana
        LocalDateTime startOfWeek = LocalDateTime.now().minusDays(7);
        Long thisWeekWorkouts = (long) workoutSessionRepository.findThisWeekWorkouts(user, startOfWeek).size();
        Double thisWeekVolume = workoutSessionRepository.getThisWeekVolumeByUser(user, startOfWeek);

        // Último entrenamiento
        Optional<WorkoutSession> lastWorkout = workoutSessionRepository.findTopByUserOrderByCompletedAtDesc(user);

        // Rutinas más usadas
        List<Object[]> routineUsage = workoutSessionRepository.getMostUsedRoutines(user);
        List<WorkoutStatsResponse.RoutineUsageStats> mostUsedRoutines = routineUsage.stream()
                .limit(5) // Top 5
                .map(row -> WorkoutStatsResponse.RoutineUsageStats.builder()
                        .routineName((String) row[0])
                        .timesCompleted(((Number) row[1]).longValue())
                        .build())
                .collect(Collectors.toList());

        // Estadísticas mensuales
        List<Object[]> monthlyData = workoutSessionRepository.getMonthlyStats(user);
        List<WorkoutStatsResponse.MonthlyStats> monthlyStats = monthlyData.stream()
                .limit(12) // Últimos 12 meses
                .map(row -> {
                    Integer year = ((Number) row[0]).intValue();
                    Integer month = ((Number) row[1]).intValue();
                    Long count = ((Number) row[2]).longValue();
                    Double duration = row[3] != null ? ((Number) row[3]).doubleValue() : 0.0;
                    Double volume = row[4] != null ? ((Number) row[4]).doubleValue() : 0.0;

                    return WorkoutStatsResponse.MonthlyStats.builder()
                            .year(year)
                            .month(month)
                            .monthName(getMonthName(month))
                            .workoutsCount(count)
                            .averageDuration(duration)
                            .totalVolume(volume)
                            .build();
                })
                .collect(Collectors.toList());

        return WorkoutStatsResponse.builder()
                .totalWorkouts(totalWorkouts)
                .totalVolume(totalVolume)
                .averageDuration(avgDuration)
                .averageCompletionPercentage(avgCompletion)
                .fullyCompletedWorkouts(fullyCompleted)
                .thisWeekWorkouts(thisWeekWorkouts)
                .thisWeekVolume(thisWeekVolume != null ? thisWeekVolume : 0.0)
                .lastWorkoutDate(lastWorkout.map(WorkoutSession::getCompletedAt).orElse(null))
                .lastWorkoutRoutine(lastWorkout.map(WorkoutSession::getRoutineName).orElse(null))
                .mostUsedRoutines(mostUsedRoutines)
                .monthlyProgress(monthlyStats)
                .build();
    }

    // =========================================================================
    // MÉTODOS AUXILIARES
    // =========================================================================

    /**
     * Valida la request de completar entrenamiento.
     */
    private void validateCompleteWorkoutRequest(CompleteWorkoutRequest request) {
        if (request.getRoutineName() == null || request.getRoutineName().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre de la rutina es obligatorio");
        }

        if (request.getStartedAt() == null) {
            throw new IllegalArgumentException("La fecha de inicio es obligatoria");
        }

        if (request.getCompletedAt() == null) {
            throw new IllegalArgumentException("La fecha de finalización es obligatoria");
        }

        if (request.getStartedAt().isAfter(request.getCompletedAt())) {
            throw new IllegalArgumentException("La fecha de inicio no puede ser posterior a la de finalización");
        }

        if (request.getExercises() == null || request.getExercises().isEmpty()) {
            throw new IllegalArgumentException("Debe haber al menos un ejercicio");
        }
    }

    /**
     * Calcula las estadísticas de la sesión.
     */
    private void calculateSessionStats(WorkoutSession session, CompleteWorkoutRequest request) {
        // Calcular duración
        session.calculateDuration();

        // Contar series totales y completadas
        int totalSets = 0;
        int completedSets = 0;

        for (CompleteWorkoutRequest.CompletedExercise exercise : request.getExercises()) {
            if (exercise.getSets() != null) {
                totalSets += exercise.getSets().size();
                completedSets += (int) exercise.getSets().stream()
                        .filter(set -> set.getCompleted() != null && set.getCompleted())
                        .count();
            }
        }

        session.setTotalSets(totalSets);
        session.setCompletedSets(completedSets);
        session.calculateCompletionPercentage();
    }

    /**
     * Crea los ejercicios y series de la sesión.
     */
    private void createSessionExercises(WorkoutSession session, List<CompleteWorkoutRequest.CompletedExercise> exercises) {
        for (CompleteWorkoutRequest.CompletedExercise exerciseRequest : exercises) {
            // Buscar el ejercicio base
            Exercise exercise = null;
            if (exerciseRequest.getExerciseId() != null) {
                exercise = exerciseRepository.findById(exerciseRequest.getExerciseId()).orElse(null);
            }

            // Crear ejercicio de sesión
            WorkoutSessionExercise sessionExercise = WorkoutSessionExercise.builder()
                    .workoutSession(session)
                    .exercise(exercise)
                    .exerciseName(exerciseRequest.getExerciseName())
                    .exerciseMuscle(exerciseRequest.getExerciseMuscle())
                    .exerciseOrder(exerciseRequest.getExerciseOrder())
                    .plannedSets(exerciseRequest.getSets().size())
                    .restBetweenSets(exerciseRequest.getRestBetweenSets())
                    .notes(exerciseRequest.getNotes())
                    .wasAddedDuringWorkout(exerciseRequest.getWasAddedDuringWorkout())
                    .build();

            // Contar series completadas
            int completedSets = (int) exerciseRequest.getSets().stream()
                    .filter(set -> set.getCompleted() != null && set.getCompleted())
                    .count();
            sessionExercise.setCompletedSets(completedSets);

            // Crear las series
            for (CompleteWorkoutRequest.CompletedSet setRequest : exerciseRequest.getSets()) {
                WorkoutSessionSet sessionSet = WorkoutSessionSet.builder()
                        .workoutSessionExercise(sessionExercise)
                        .setNumber(setRequest.getSetNumber())
                        .targetRepsMin(setRequest.getTargetRepsMin())
                        .targetRepsMax(setRequest.getTargetRepsMax())
                        .targetWeight(setRequest.getTargetWeight())
                        .targetRir(setRequest.getTargetRir())
                        .targetRpe(setRequest.getTargetRpe())
                        .targetNotes(setRequest.getTargetNotes())
                        .actualReps(setRequest.getActualReps())
                        .actualWeight(setRequest.getActualWeight())
                        .actualRir(setRequest.getActualRir())
                        .actualRpe(setRequest.getActualRpe())
                        .actualNotes(setRequest.getActualNotes())
                        .completed(setRequest.getCompleted() != null ? setRequest.getCompleted() : false)
                        .wasAddedDuringWorkout(setRequest.getWasAddedDuringWorkout())
                        .build();

                // Añadir a la lista (se guardarán automáticamente por cascada)
                sessionExercise.getSets().add(sessionSet);
            }

            // Calcular volumen del ejercicio
            sessionExercise.calculateTotalVolume();

            // Añadir a la sesión
            session.getExercises().add(sessionExercise);
        }
    }

    /**
     * Recalcula el volumen total de la sesión.
     */
    private void recalculateSessionVolume(WorkoutSession session) {
        if (session.getExercises() != null) {
            double totalVolume = session.getExercises().stream()
                    .filter(ex -> ex.getTotalVolume() != null)
                    .mapToDouble(WorkoutSessionExercise::getTotalVolume)
                    .sum();
            session.setTotalVolume(totalVolume);
            workoutSessionRepository.save(session);
        }
    }

    /**
     * Convierte WorkoutSession a WorkoutHistoryResponse (sin detalles).
     */
    private WorkoutHistoryResponse convertToHistoryResponse(WorkoutSession session) {
        return WorkoutHistoryResponse.builder()
                .id(session.getId())
                .routineName(session.getRoutineName())
                .routineDescription(session.getRoutineDescription())
                .startedAt(session.getStartedAt())
                .completedAt(session.getCompletedAt())
                .durationMinutes(session.getDurationMinutes())
                .totalExercises(session.getTotalExercises())
                .totalSets(session.getTotalSets())
                .completedSets(session.getCompletedSets())
                .completionPercentage(session.getCompletionPercentage())
                .totalVolume(session.getTotalVolume())
                .notes(session.getNotes())
                .build();
    }

    /**
     * Convierte WorkoutSession a WorkoutHistoryResponse (con detalles completos).
     */
    private WorkoutHistoryResponse convertToHistoryResponseWithDetails(WorkoutSession session) {
        WorkoutHistoryResponse response = convertToHistoryResponse(session);

        if (session.getExercises() != null) {
            List<WorkoutHistoryExercise> exercises = session.getExercises().stream()
                    .map(this::convertToHistoryExercise)
                    .collect(Collectors.toList());
            response.setExercises(exercises);
        }

        return response;
    }

    /**
     * Convierte WorkoutSessionExercise a WorkoutHistoryExercise.
     */
    private WorkoutHistoryExercise convertToHistoryExercise(WorkoutSessionExercise sessionExercise) {
        WorkoutHistoryExercise exercise = WorkoutHistoryExercise.builder()
                .exerciseName(sessionExercise.getExerciseName())
                .exerciseMuscle(sessionExercise.getExerciseMuscle())
                .exerciseOrder(sessionExercise.getExerciseOrder())
                .plannedSets(sessionExercise.getPlannedSets())
                .completedSets(sessionExercise.getCompletedSets())
                .totalVolume(sessionExercise.getTotalVolume())
                .wasAddedDuringWorkout(sessionExercise.getWasAddedDuringWorkout())
                .build();

        if (sessionExercise.getSets() != null) {
            List<WorkoutHistorySet> sets = sessionExercise.getSets().stream()
                    .map(this::convertToHistorySet)
                    .collect(Collectors.toList());
            exercise.setSets(sets);
        }

        return exercise;
    }

    /**
     * Convierte WorkoutSessionSet a WorkoutHistorySet.
     */
    private WorkoutHistorySet convertToHistorySet(WorkoutSessionSet sessionSet) {
        return WorkoutHistorySet.builder()
                .setNumber(sessionSet.getSetNumber())
                .targetRepsMin(sessionSet.getTargetRepsMin())
                .targetRepsMax(sessionSet.getTargetRepsMax())
                .targetWeight(sessionSet.getTargetWeight())
                .targetRir(sessionSet.getTargetRir())
                .targetRpe(sessionSet.getTargetRpe())
                .actualReps(sessionSet.getActualReps())
                .actualWeight(sessionSet.getActualWeight())
                .actualRir(sessionSet.getActualRir())
                .actualRpe(sessionSet.getActualRpe())
                .actualNotes(sessionSet.getActualNotes())
                .completed(sessionSet.getCompleted())
                .wasAddedDuringWorkout(sessionSet.getWasAddedDuringWorkout())
                .volume(sessionSet.getVolume())
                .performanceComparison(sessionSet.getPerformanceComparison())
                .build();
    }

    /**
     * Obtiene el nombre del mes en español.
     */
    private String getMonthName(Integer month) {
        String[] monthNames = {
                "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        };
        return month >= 1 && month <= 12 ? monthNames[month - 1] : "Mes " + month;
    }
}