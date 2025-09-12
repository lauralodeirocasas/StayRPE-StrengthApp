package com.example.stayrpe.rest;

import com.example.stayrpe.dto.*;
import com.example.stayrpe.model.Usuario;
import com.example.stayrpe.model.WorkoutSession;
import com.example.stayrpe.repository.UsuarioRepository;
import com.example.stayrpe.service.WorkoutSessionService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/workout-history")
public class WorkoutHistoryController {

    private static final Logger logger = LoggerFactory.getLogger(WorkoutHistoryController.class);

    private final WorkoutSessionService workoutSessionService;
    private final UsuarioRepository usuarioRepository;

    public WorkoutHistoryController(
            WorkoutSessionService workoutSessionService,
            UsuarioRepository usuarioRepository
    ) {
        this.workoutSessionService = workoutSessionService;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping("/check-day")
    public ResponseEntity<?> checkDayTrained(
            @RequestParam(required = false) Long macrocycleId,
            @RequestParam(required = false) Integer absoluteDay) {

        logger.info("🔍 Verificando si ya entrenó - Macrociclo: {}, Día: {}", macrocycleId, absoluteDay);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            boolean alreadyTrained = workoutSessionService.hasAlreadyTrainedToday(usuario, macrocycleId, absoluteDay);

            Map<String, Object> response = new HashMap<>();
            response.put("alreadyTrained", alreadyTrained);
            response.put("macrocycleId", macrocycleId);
            response.put("absoluteDay", absoluteDay);

            if (alreadyTrained) {
                Optional<WorkoutSession> existingWorkout = workoutSessionService.getTodaysWorkout(usuario, macrocycleId, absoluteDay);
                if (existingWorkout.isPresent()) {
                    WorkoutSession session = existingWorkout.get();
                    response.put("existingWorkout", Map.of(
                            "id", session.getId(),
                            "routineName", session.getRoutineName(),
                            "completedAt", session.getCompletedAt(),
                            "completionPercentage", session.getCompletionPercentage(),
                            "durationMinutes", session.getDurationMinutes()
                    ));
                }

                response.put("message", String.format("Ya existe un entrenamiento para el día %d", absoluteDay));
            } else {
                response.put("message", "Puedes entrenar este día");
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error verificando día de entrenamiento", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error interno del servidor"));
        }
    }

    @PostMapping("/complete")
    public ResponseEntity<?> completeWorkout(@RequestBody CompleteWorkoutRequest request) {
        logger.info("Recibida solicitud para completar entrenamiento: {} - Macrociclo: {}, Día: {}",
                request.getRoutineName(), request.getMacrocycleId(), request.getAbsoluteDay());

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            if (request.belongsToMacrocycle()) {
                boolean alreadyTrained = workoutSessionService.hasAlreadyTrainedToday(
                        usuario, request.getMacrocycleId(), request.getAbsoluteDay());

                if (alreadyTrained) {
                    logger.warn("Intento de entrenar día ya completado - Usuario: {}, Día: {}",
                            usuario.getUsername(), request.getAbsoluteDay());

                    return ResponseEntity.badRequest().body(Map.of(
                            "error", String.format("Ya completaste el entrenamiento del día %d", request.getAbsoluteDay()),
                            "alreadyTrained", true,
                            "absoluteDay", request.getAbsoluteDay()
                    ));
                }
            }

            WorkoutSession savedSession = workoutSessionService.saveCompletedWorkout(usuario, request);

            logger.info("Entrenamiento completado y guardado con ID: {} para usuario: {} - Tipo: {}",
                    savedSession.getId(), usuario.getUsername(), request.getWorkoutType());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "¡Entrenamiento completado y guardado exitosamente!");
            response.put("sessionId", savedSession.getId());
            response.put("routineName", savedSession.getRoutineName());
            response.put("durationMinutes", savedSession.getDurationMinutes());
            response.put("completedSets", savedSession.getCompletedSets());
            response.put("totalSets", savedSession.getTotalSets());
            response.put("completionPercentage", savedSession.getCompletionPercentage());
            response.put("totalVolume", savedSession.getTotalVolume());

            if (savedSession.belongsToMacrocycle()) {
                response.put("macrocycleName", savedSession.getMacrocycle().getName());
                response.put("absoluteDay", savedSession.getAbsoluteDay());
                response.put("workoutType", "macrocycle");
            } else {
                response.put("workoutType", "free");
            }

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            logger.warn("Error de validación al completar entrenamiento: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error interno al completar entrenamiento", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error interno del servidor"));
        }
    }

    @GetMapping
    public ResponseEntity<List<WorkoutHistoryResponse>> getWorkoutHistory(
            @RequestParam(defaultValue = "20") int limit) {

        logger.info("Solicitando historial de entrenamientos (límite: {})", limit);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().build();
        }

        try {
            List<WorkoutHistoryResponse> history = workoutSessionService.getWorkoutHistory(usuario, limit);

            logger.info("Devolviendo {} entrenamientos del historial para usuario: {}",
                    history.size(), usuario.getUsername());

            return ResponseEntity.ok(history);

        } catch (Exception e) {
            logger.error("Error obteniendo historial de entrenamientos", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<?> getWorkoutDetails(@PathVariable Long sessionId) {
        logger.info("Solicitando detalles de sesión: {}", sessionId);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<WorkoutHistoryResponse> details = workoutSessionService.getWorkoutDetails(usuario, sessionId);

            if (details.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            logger.info("Devolviendo detalles de sesión {} para usuario: {}", sessionId, usuario.getUsername());
            return ResponseEntity.ok(details.get());

        } catch (Exception e) {
            logger.error("Error obteniendo detalles de sesión", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error interno del servidor"));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getWorkoutStats() {
        logger.info("Solicitando estadísticas de entrenamientos");

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            WorkoutStatsResponse stats = workoutSessionService.getWorkoutStats(usuario);

            logger.info("Devolviendo estadísticas para usuario: {} - {} entrenamientos totales",
                    usuario.getUsername(), stats.getTotalWorkouts());

            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            logger.error("Error obteniendo estadísticas de entrenamientos", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error interno del servidor"));
        }
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getWorkoutSummary() {
        logger.info("Solicitando resumen de entrenamientos para dashboard");

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            WorkoutStatsResponse stats = workoutSessionService.getWorkoutStats(usuario);

            Map<String, Object> summary = new HashMap<>();

            summary.put("totalWorkouts", stats.getTotalWorkouts() != null ? stats.getTotalWorkouts() : 0L);
            summary.put("thisWeekWorkouts", stats.getThisWeekWorkouts() != null ? stats.getThisWeekWorkouts() : 0L);

            summary.put("totalVolume", stats.getTotalVolume() != null ? Math.round(stats.getTotalVolume()) : 0);
            summary.put("averageDuration", stats.getAverageDuration() != null ? Math.round(stats.getAverageDuration()) : 0);

            summary.put("lastWorkoutDate", stats.getLastWorkoutDate());
            summary.put("lastWorkoutRoutine", stats.getLastWorkoutRoutine() != null ? stats.getLastWorkoutRoutine() : "Ninguno");

            logger.info("Resumen generado exitosamente para usuario: {}", usuario.getUsername());
            return ResponseEntity.ok(summary);

        } catch (Exception e) {
            logger.error("Error obteniendo resumen de entrenamientos para usuario: {}", usuario.getUsername(), e);

            Map<String, Object> defaultSummary = new HashMap<>();
            defaultSummary.put("totalWorkouts", 0L);
            defaultSummary.put("thisWeekWorkouts", 0L);
            defaultSummary.put("totalVolume", 0);
            defaultSummary.put("averageDuration", 0);
            defaultSummary.put("lastWorkoutDate", null);
            defaultSummary.put("lastWorkoutRoutine", "Ninguno");

            return ResponseEntity.ok(defaultSummary);
        }
    }

    @GetMapping("/completed-days")
    public ResponseEntity<?> getCompletedDays(@RequestParam Long macrocycleId) {
        logger.info("Solicitando días completados para macrociclo: {}", macrocycleId);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            List<WorkoutHistoryResponse> workouts = workoutSessionService.getWorkoutHistory(usuario, 200);

            List<Integer> completedDays = workouts.stream()
                    .filter(w -> w.getMacrocycleName() != null && w.getAbsoluteDay() != null)
                    .filter(w -> w.getCompletionPercentage() >= 80)
                    .map(WorkoutHistoryResponse::getAbsoluteDay)
                    .distinct()
                    .sorted()
                    .collect(java.util.stream.Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("macrocycleId", macrocycleId);
            response.put("completedDays", completedDays);
            response.put("totalCompletedDays", completedDays.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error obteniendo días completados", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error interno del servidor"));
        }
    }

    @DeleteMapping("/{sessionId}")
    public ResponseEntity<?> deleteWorkoutSession(@PathVariable Long sessionId) {
        logger.info("Solicitando eliminación de sesión: {}", sessionId);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        return ResponseEntity.badRequest().body(Map.of("error", "Funcionalidad no implementada"));
    }

    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElse(null);
    }
}