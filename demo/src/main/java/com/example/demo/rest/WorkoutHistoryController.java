package com.example.demo.rest;

import com.example.demo.dto.*;
import com.example.demo.model.Usuario;
import com.example.demo.model.WorkoutSession;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.service.WorkoutSessionService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller para gestionar el historial de entrenamientos.
 */
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

    // =========================================================================
    // ENDPOINT PRINCIPAL: COMPLETAR ENTRENAMIENTO
    // =========================================================================

    /**
     * 🔥 ENDPOINT PRINCIPAL: Guarda un entrenamiento completado.
     *
     * POST /workout-history/complete
     *
     * Este es el endpoint que se llama desde el frontend cuando el usuario
     * presiona "Finalizar" en el entrenamiento.
     */
    @PostMapping("/complete")
    public ResponseEntity<?> completeWorkout(@RequestBody CompleteWorkoutRequest request) {
        logger.info("Recibida solicitud para completar entrenamiento: {}", request.getRoutineName());

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            // Guardar el entrenamiento en el historial
            WorkoutSession savedSession = workoutSessionService.saveCompletedWorkout(usuario, request);

            logger.info("Entrenamiento completado y guardado con ID: {} para usuario: {}",
                    savedSession.getId(), usuario.getUsername());

            // Respuesta de éxito
            return ResponseEntity.ok(Map.of(
                    "message", "¡Entrenamiento completado y guardado exitosamente!",
                    "sessionId", savedSession.getId(),
                    "routineName", savedSession.getRoutineName(),
                    "durationMinutes", savedSession.getDurationMinutes(),
                    "completedSets", savedSession.getCompletedSets(),
                    "totalSets", savedSession.getTotalSets(),
                    "completionPercentage", savedSession.getCompletionPercentage(),
                    "totalVolume", savedSession.getTotalVolume()
            ));

        } catch (IllegalArgumentException e) {
            logger.warn("Error de validación al completar entrenamiento: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error interno al completar entrenamiento", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error interno del servidor"));
        }
    }

    // =========================================================================
    // ENDPOINTS PARA CONSULTAR HISTORIAL
    // =========================================================================

    /**
     * Obtiene el historial de entrenamientos del usuario.
     *
     * GET /workout-history?limit=10
     */
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

    /**
     * Obtiene los detalles completos de un entrenamiento específico.
     *
     * GET /workout-history/{sessionId}
     */
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

    /**
     * Obtiene estadísticas generales del usuario.
     *
     * GET /workout-history/stats
     */
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

    // =========================================================================
    // ENDPOINTS ADICIONALES
    // =========================================================================

    /**
     * Obtiene un resumen rápido para el dashboard.
     *
     * GET /workout-history/summary
     */
    @GetMapping("/summary")
    public ResponseEntity<?> getWorkoutSummary() {
        logger.info("Solicitando resumen de entrenamientos para dashboard");

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            WorkoutStatsResponse stats = workoutSessionService.getWorkoutStats(usuario);

            // Crear un resumen simplificado
            Map<String, Object> summary = Map.of(
                    "totalWorkouts", stats.getTotalWorkouts(),
                    "thisWeekWorkouts", stats.getThisWeekWorkouts(),
                    "totalVolume", Math.round(stats.getTotalVolume()),
                    "averageDuration", Math.round(stats.getAverageDuration()),
                    "lastWorkoutDate", stats.getLastWorkoutDate(),
                    "lastWorkoutRoutine", stats.getLastWorkoutRoutine() != null ? stats.getLastWorkoutRoutine() : "Ninguno"
            );

            return ResponseEntity.ok(summary);

        } catch (Exception e) {
            logger.error("Error obteniendo resumen de entrenamientos", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error interno del servidor"));
        }
    }

    /**
     * Elimina un entrenamiento del historial.
     *
     * DELETE /workout-history/{sessionId}
     */
    @DeleteMapping("/{sessionId}")
    public ResponseEntity<?> deleteWorkoutSession(@PathVariable Long sessionId) {
        logger.info("Solicitando eliminación de sesión: {}", sessionId);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        // TODO: Implementar eliminación si es necesario
        // Por ahora retornamos que no está implementado
        return ResponseEntity.badRequest().body(Map.of("error", "Funcionalidad no implementada"));
    }

    // =========================================================================
    // MÉTODOS AUXILIARES
    // =========================================================================

    /**
     * Obtiene el usuario actualmente autenticado.
     */
    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElse(null);
    }
}