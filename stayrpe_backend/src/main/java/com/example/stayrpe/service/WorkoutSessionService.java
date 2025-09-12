package com.example.stayrpe.service;

import com.example.stayrpe.dto.*;
import com.example.stayrpe.model.*;
import com.example.stayrpe.repository.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class WorkoutSessionService {

    private static final Logger logger = LoggerFactory.getLogger(WorkoutSessionService.class);

    private final WorkoutSessionRepository workoutSessionRepository;
    private final RoutineRepository routineRepository;
    private final ExerciseRepository exerciseRepository;
    private final MacrocycleRepository macrocycleRepository;

    public WorkoutSessionService(
            WorkoutSessionRepository workoutSessionRepository,
            RoutineRepository routineRepository,
            ExerciseRepository exerciseRepository,
            MacrocycleRepository macrocycleRepository
    ) {
        this.workoutSessionRepository = workoutSessionRepository;
        this.routineRepository = routineRepository;
        this.exerciseRepository = exerciseRepository;
        this.macrocycleRepository = macrocycleRepository;
    }

    public boolean hasAlreadyTrainedToday(Usuario user, Long macrocycleId, Integer absoluteDay) {
        logger.info("Verificando si el usuario {} ya entrenó - Macrociclo: {}, Día: {}",
                user.getUsername(), macrocycleId, absoluteDay);

        if (macrocycleId == null || absoluteDay == null) {
            logger.info("Entrenamiento libre permitido (sin macrociclo)");
            return false;
        }

        Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(macrocycleId);
        if (macrocycleOpt.isEmpty()) {
            logger.warn("Macrociclo no encontrado: {}", macrocycleId);
            return false;
        }

        Macrocycle macrocycle = macrocycleOpt.get();

        boolean alreadyTrained = workoutSessionRepository.existsByUserAndMacrocycleAndAbsoluteDay(
                user, macrocycle, absoluteDay);

        if (alreadyTrained) {
            logger.info("Usuario {} ya entrenó el día {} del macrociclo {}",
                    user.getUsername(), absoluteDay, macrocycle.getName());
        } else {
            logger.info("Usuario {} puede entrenar el día {} del macrociclo {}",
                    user.getUsername(), absoluteDay, macrocycle.getName());
        }

        return alreadyTrained;
    }

    public Optional<WorkoutSession> getTodaysWorkout(Usuario user, Long macrocycleId, Integer absoluteDay) {
        if (macrocycleId == null || absoluteDay == null) {
            return Optional.empty();
        }

        Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(macrocycleId);
        if (macrocycleOpt.isEmpty()) {
            return Optional.empty();
        }

        return workoutSessionRepository.findByUserAndMacrocycleAndAbsoluteDay(
                user, macrocycleOpt.get(), absoluteDay);
    }

    public List<Integer> getCompletedDaysForMacrocycle(Usuario user, Macrocycle macrocycle) {
        logger.info("Obteniendo días completados para macrociclo: {}", macrocycle.getName());

        List<Integer> completedDays = workoutSessionRepository
                .findCompletedAbsoluteDaysByUserAndMacrocycle(user, macrocycle);

        logger.info("Días completados encontrados: {}", completedDays);
        return completedDays;
    }

    public WorkoutSession saveCompletedWorkout(Usuario user, CompleteWorkoutRequest request) {
        logger.info("Guardando entrenamiento completado para usuario: {}", user.getUsername());

        validateCompleteWorkoutRequest(request);

        if (request.getMacrocycleId() != null && request.getAbsoluteDay() != null) {
            boolean alreadyTrained = hasAlreadyTrainedToday(user, request.getMacrocycleId(), request.getAbsoluteDay());
            if (alreadyTrained) {
                throw new IllegalArgumentException(
                        String.format("Ya existe un entrenamiento para el día %d de este macrociclo", request.getAbsoluteDay()));
            }
        }

        Routine routine = null;
        if (request.getRoutineId() != null) {
            routine = routineRepository.findById(request.getRoutineId()).orElse(null);
        }

        Macrocycle macrocycle = null;
        String macrocycleName = null;
        if (request.getMacrocycleId() != null) {
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(request.getMacrocycleId());
            if (macrocycleOpt.isPresent()) {
                macrocycle = macrocycleOpt.get();
                macrocycleName = macrocycle.getName();
            }
        }

        WorkoutSession session = WorkoutSession.builder()
                .user(user)
                .routine(routine)
                .routineName(request.getRoutineName())
                .routineDescription(request.getRoutineDescription())
                .startedAt(request.getStartedAt())
                .completedAt(request.getCompletedAt())
                .totalExercises(request.getExercises().size())
                .notes(request.getNotes())
                .macrocycle(macrocycle)
                .macrocycleName(macrocycleName)
                .absoluteDay(request.getAbsoluteDay())
                .build();

        calculateSessionStats(session, request);

        WorkoutSession savedSession = workoutSessionRepository.save(session);

        createSessionExercises(savedSession, request.getExercises());

        recalculateSessionVolume(savedSession);

        logger.info("Entrenamiento guardado con ID: {} - {} ejercicios, {} series completadas - Macrociclo: {}, Día: {}",
                savedSession.getId(), savedSession.getTotalExercises(), savedSession.getCompletedSets(),
                macrocycleName != null ? macrocycleName : "Libre", savedSession.getAbsoluteDay());

        return savedSession;
    }

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

    public Optional<WorkoutHistoryResponse> getWorkoutDetails(Usuario user, Long sessionId) {
        logger.info("Obteniendo detalles de sesión {} para usuario: {}", sessionId, user.getUsername());

        Optional<WorkoutSession> sessionOpt = workoutSessionRepository.findById(sessionId);

        if (sessionOpt.isEmpty()) {
            return Optional.empty();
        }

        WorkoutSession session = sessionOpt.get();

        if (!session.getUser().getId().equals(user.getId())) {
            logger.warn("Usuario {} intentó acceder a sesión {} que no le pertenece",
                    user.getUsername(), sessionId);
            return Optional.empty();
        }

        return Optional.of(convertToHistoryResponseWithDetails(session));
    }

    public WorkoutStatsResponse getWorkoutStats(Usuario user) {
        logger.info("Obteniendo estadísticas de entrenamientos para usuario: {}", user.getUsername());

        try {
            Long totalWorkouts = 0L;
            Double totalVolume = 0.0;
            Double avgDuration = 0.0;
            Double avgCompletion = 0.0;

            try {
                Object[] dashboardStats = workoutSessionRepository.getDashboardStats(user);
                logger.debug("Dashboard stats resultado: {}", java.util.Arrays.toString(dashboardStats));

                if (dashboardStats != null && dashboardStats.length >= 4) {
                    totalWorkouts = convertToLong(dashboardStats[0]);
                    totalVolume = convertToDouble(dashboardStats[1]);
                    avgDuration = convertToDouble(dashboardStats[2]);
                    avgCompletion = convertToDouble(dashboardStats[3]);
                } else {
                    logger.warn("Dashboard stats retornó resultado inesperado: {}", dashboardStats);
                }
            } catch (Exception e) {
                logger.error("Error obteniendo dashboard stats, usando valores por defecto", e);
            }

            Long fullyCompleted = 0L;
            try {
                fullyCompleted = workoutSessionRepository.countFullyCompletedWorkouts(user);
            } catch (Exception e) {
                logger.error("Error obteniendo entrenamientos completados", e);
            }

            LocalDateTime startOfWeek = LocalDateTime.now().minusDays(7);
            Long thisWeekWorkouts = 0L;
            Double thisWeekVolume = 0.0;

            try {
                List<WorkoutSession> thisWeekSessions = workoutSessionRepository.findThisWeekWorkouts(user, startOfWeek);
                thisWeekWorkouts = (long) thisWeekSessions.size();
                thisWeekVolume = workoutSessionRepository.getThisWeekVolumeByUser(user, startOfWeek);
                if (thisWeekVolume == null) thisWeekVolume = 0.0;
            } catch (Exception e) {
                logger.error("Error obteniendo estadísticas de esta semana", e);
            }

            Optional<WorkoutSession> lastWorkout = Optional.empty();
            try {
                lastWorkout = workoutSessionRepository.findTopByUserOrderByCompletedAtDesc(user);
            } catch (Exception e) {
                logger.error("Error obteniendo último entrenamiento", e);
            }

            List<WorkoutStatsResponse.RoutineUsageStats> mostUsedRoutines = List.of();
            try {
                List<Object[]> routineUsage = workoutSessionRepository.getMostUsedRoutines(user);
                mostUsedRoutines = routineUsage.stream()
                        .limit(5)
                        .map(row -> {
                            try {
                                return WorkoutStatsResponse.RoutineUsageStats.builder()
                                        .routineName((String) row[0])
                                        .timesCompleted(convertToLong(row[1]))
                                        .build();
                            } catch (Exception e) {
                                logger.error("Error procesando rutina usage stat: {}", java.util.Arrays.toString(row), e);
                                return null;
                            }
                        })
                        .filter(java.util.Objects::nonNull)
                        .collect(Collectors.toList());
            } catch (Exception e) {
                logger.error("Error obteniendo rutinas más usadas", e);
            }

            List<WorkoutStatsResponse.MonthlyStats> monthlyStats = List.of();
            try {
                List<Object[]> monthlyData = workoutSessionRepository.getMonthlyStats(user);
                monthlyStats = monthlyData.stream()
                        .limit(12)
                        .map(row -> {
                            try {
                                Integer year = convertToInteger(row[0]);
                                Integer month = convertToInteger(row[1]);
                                Long count = convertToLong(row[2]);
                                Double duration = row[3] != null ? convertToDouble(row[3]) : 0.0;
                                Double volume = row[4] != null ? convertToDouble(row[4]) : 0.0;

                                return WorkoutStatsResponse.MonthlyStats.builder()
                                        .year(year)
                                        .month(month)
                                        .monthName(getMonthName(month))
                                        .workoutsCount(count)
                                        .averageDuration(duration)
                                        .totalVolume(volume)
                                        .build();
                            } catch (Exception e) {
                                logger.error("Error procesando monthly stat: {}", java.util.Arrays.toString(row), e);
                                return null;
                            }
                        })
                        .filter(java.util.Objects::nonNull)
                        .collect(Collectors.toList());
            } catch (Exception e) {
                logger.error("Error obteniendo estadísticas mensuales", e);
            }

            return WorkoutStatsResponse.builder()
                    .totalWorkouts(totalWorkouts)
                    .totalVolume(totalVolume)
                    .averageDuration(avgDuration)
                    .averageCompletionPercentage(avgCompletion)
                    .fullyCompletedWorkouts(fullyCompleted)
                    .thisWeekWorkouts(thisWeekWorkouts)
                    .thisWeekVolume(thisWeekVolume)
                    .lastWorkoutDate(lastWorkout.map(WorkoutSession::getCompletedAt).orElse(null))
                    .lastWorkoutRoutine(lastWorkout.map(WorkoutSession::getRoutineName).orElse(null))
                    .mostUsedRoutines(mostUsedRoutines)
                    .monthlyProgress(monthlyStats)
                    .build();

        } catch (Exception e) {
            logger.error("Error crítico obteniendo estadísticas para usuario: {}", user.getUsername(), e);

            return WorkoutStatsResponse.builder()
                    .totalWorkouts(0L)
                    .totalVolume(0.0)
                    .averageDuration(0.0)
                    .averageCompletionPercentage(0.0)
                    .fullyCompletedWorkouts(0L)
                    .thisWeekWorkouts(0L)
                    .thisWeekVolume(0.0)
                    .lastWorkoutDate(null)
                    .lastWorkoutRoutine(null)
                    .mostUsedRoutines(List.of())
                    .monthlyProgress(List.of())
                    .build();
        }
    }

    private Long convertToLong(Object value) {
        if (value == null) return 0L;
        if (value instanceof Long) return (Long) value;
        if (value instanceof Number) return ((Number) value).longValue();
        if (value instanceof String) {
            try {
                return Long.parseLong((String) value);
            } catch (NumberFormatException e) {
                logger.warn("No se pudo convertir '{}' a Long", value);
                return 0L;
            }
        }
        logger.warn("Tipo inesperado para convertir a Long: {} - {}", value.getClass(), value);
        return 0L;
    }

    private Double convertToDouble(Object value) {
        if (value == null) return 0.0;
        if (value instanceof Double) return (Double) value;
        if (value instanceof Number) return ((Number) value).doubleValue();
        if (value instanceof String) {
            try {
                return Double.parseDouble((String) value);
            } catch (NumberFormatException e) {
                logger.warn("No se pudo convertir '{}' a Double", value);
                return 0.0;
            }
        }
        logger.warn("Tipo inesperado para convertir a Double: {} - {}", value.getClass(), value);
        return 0.0;
    }

    private Integer convertToInteger(Object value) {
        if (value == null) return 0;
        if (value instanceof Integer) return (Integer) value;
        if (value instanceof Number) return ((Number) value).intValue();
        if (value instanceof String) {
            try {
                return Integer.parseInt((String) value);
            } catch (NumberFormatException e) {
                logger.warn("No se pudo convertir '{}' a Integer", value);
                return 0;
            }
        }
        logger.warn("Tipo inesperado para convertir a Integer: {} - {}", value.getClass(), value);
        return 0;
    }

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

    private void calculateSessionStats(WorkoutSession session, CompleteWorkoutRequest request) {
        session.calculateDuration();

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

    private void createSessionExercises(WorkoutSession session, List<CompleteWorkoutRequest.CompletedExercise> exercises) {
        for (CompleteWorkoutRequest.CompletedExercise exerciseRequest : exercises) {
            Exercise exercise = null;
            if (exerciseRequest.getExerciseId() != null) {
                exercise = exerciseRepository.findById(exerciseRequest.getExerciseId()).orElse(null);
            }

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

            int completedSets = (int) exerciseRequest.getSets().stream()
                    .filter(set -> set.getCompleted() != null && set.getCompleted())
                    .count();
            sessionExercise.setCompletedSets(completedSets);

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

                sessionExercise.getSets().add(sessionSet);
            }

            sessionExercise.calculateTotalVolume();
            session.getExercises().add(sessionExercise);
        }
    }

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

    private WorkoutHistoryResponse convertToHistoryResponse(WorkoutSession session) {
        WorkoutHistoryResponse.WorkoutHistoryResponseBuilder builder = WorkoutHistoryResponse.builder()
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
                .notes(session.getNotes());

        if (session.getMacrocycleName() != null && session.getAbsoluteDay() != null) {
            builder.macrocycleName(session.getMacrocycleName())
                    .absoluteDay(session.getAbsoluteDay());
        }

        return builder.build();
    }

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

    private String getMonthName(Integer month) {
        String[] monthNames = {
                "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        };
        return month >= 1 && month <= 12 ? monthNames[month - 1] : "Mes " + month;
    }
}