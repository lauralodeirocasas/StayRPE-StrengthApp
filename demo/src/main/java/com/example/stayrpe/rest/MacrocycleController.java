package com.example.stayrpe.rest;

import com.example.stayrpe.dto.CreateMacrocycleDTO;
import com.example.stayrpe.dto.DayCustomizationRequest;
import com.example.stayrpe.dto.DayCustomizationResponse;
import com.example.stayrpe.model.Macrocycle;
import com.example.stayrpe.model.MacrocycleDayPlan;
import com.example.stayrpe.model.Routine;
import com.example.stayrpe.model.Usuario;
import com.example.stayrpe.repository.*;
import com.example.stayrpe.service.MacrocycleCustomizationService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/macrocycles")
public class MacrocycleController {

    private static final Logger logger = LoggerFactory.getLogger(MacrocycleController.class);

    private final MacrocycleRepository macrocycleRepository;
    private final MacrocycleDayPlanRepository dayPlanRepository;
    private final RoutineRepository routineRepository;
    private final UsuarioRepository usuarioRepository;
    private final MacrocycleCustomizationService macrocycleCustomizationService;
    private final MacrocycleDayCustomizationRepository macrocycleDayCustomizationRepository;
    private final WorkoutSessionRepository workoutSessionRepository;

    public MacrocycleController(
            MacrocycleRepository macrocycleRepository,
            MacrocycleDayPlanRepository dayPlanRepository,
            RoutineRepository routineRepository,
            UsuarioRepository usuarioRepository,
            MacrocycleCustomizationService macrocycleCustomizationService,
            MacrocycleDayCustomizationRepository macrocycleDayCustomizationRepository,
            WorkoutSessionRepository workoutSessionRepository
    ) {
        this.macrocycleRepository = macrocycleRepository;
        this.dayPlanRepository = dayPlanRepository;
        this.routineRepository = routineRepository;
        this.usuarioRepository = usuarioRepository;
        this.macrocycleCustomizationService = macrocycleCustomizationService;
        this.macrocycleDayCustomizationRepository = macrocycleDayCustomizationRepository;
        this.workoutSessionRepository = workoutSessionRepository;
    }

    @GetMapping
    public ResponseEntity<List<Macrocycle>> getUserMacrocycles() {
        logger.info("Solicitando macrociclos activos del usuario");

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().build();
        }

        List<Macrocycle> macrocycles = macrocycleRepository.findByCreatedByAndIsArchivedFalseOrderByCurrentlyActive(usuario);
        logger.info("Devolviendo {} macrociclos activos", macrocycles.size());
        return ResponseEntity.ok(macrocycles);
    }

    @GetMapping("/archived")
    public ResponseEntity<List<Macrocycle>> getArchivedMacrocycles() {
        logger.info("Solicitando macrociclos archivados del usuario");

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().build();
        }

        List<Macrocycle> archivedMacrocycles = macrocycleRepository.findByCreatedByAndIsArchivedTrue(usuario);
        logger.info("Devolviendo {} macrociclos archivados", archivedMacrocycles.size());
        return ResponseEntity.ok(archivedMacrocycles);
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveMacrocycle() {
        logger.info("Solicitando macrociclo actualmente activo");

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        Optional<Macrocycle> activeMacrocycle = macrocycleRepository.findByCreatedByAndIsCurrentlyActiveTrue(usuario);

        if (activeMacrocycle.isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("message", "No hay macrociclo activo");
            response.put("activeMacrocycle", null);

            logger.info("No hay macrociclo activo para el usuario: {}", usuario.getUsername());
            return ResponseEntity.ok(response);
        }

        logger.info("Macrociclo activo encontrado: {}", activeMacrocycle.get().getName());
        return ResponseEntity.ok(Map.of("activeMacrocycle", activeMacrocycle.get()));
    }

    @PutMapping("/{id}/activate")
    @Transactional
    public ResponseEntity<?> activateMacrocycle(@PathVariable Long id) {
        logger.info("Activando macrociclo con ID: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);

            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para activar este macrociclo"));
            }

            if (macrocycle.isArchived()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se puede activar un macrociclo archivado"));
            }

            if (macrocycle.isCurrentlyActive()) {
                return ResponseEntity.ok(Map.of(
                        "message", "Este macrociclo ya está activo",
                        "macrocycle", macrocycle
                ));
            }

            macrocycleRepository.deactivateAllMacrocycles(usuario);

            macrocycle.setCurrentlyActive(true);
            Macrocycle activatedMacrocycle = macrocycleRepository.save(macrocycle);

            logger.info("Macrociclo activado: {} (ID: {})", activatedMacrocycle.getName(), activatedMacrocycle.getId());

            return ResponseEntity.ok(Map.of(
                    "message", "Macrociclo activado correctamente",
                    "macrocycle", activatedMacrocycle
            ));

        } catch (Exception e) {
            logger.error("Error al activar macrociclo", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al activar el macrociclo"));
        }
    }

    @PutMapping("/deactivate")
    @Transactional
    public ResponseEntity<?> deactivateCurrentMacrocycle() {
        logger.info("Desactivando macrociclo actualmente activo");

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Macrocycle> activeMacrocycle = macrocycleRepository.findByCreatedByAndIsCurrentlyActiveTrue(usuario);

            if (activeMacrocycle.isEmpty()) {
                return ResponseEntity.ok(Map.of("message", "No hay macrociclo activo para desactivar"));
            }

            Macrocycle macrocycle = activeMacrocycle.get();

            long customizationCount = macrocycleDayCustomizationRepository.countByMacrocycle(macrocycle);
            long workoutSessionsCount = workoutSessionRepository.countByMacrocycle(macrocycle);

            if (customizationCount > 0) {
                macrocycleCustomizationService.resetAllCustomizations(macrocycle);
                logger.info("Eliminadas {} customizaciones", customizationCount);
            }

            if (workoutSessionsCount > 0) {
                workoutSessionRepository.dissociateMacrocycleFromUserSessions(usuario, macrocycle);
                logger.info("Desasociados {} entrenamientos", workoutSessionsCount);
            }

            macrocycle.setCurrentlyActive(false);
            macrocycleRepository.save(macrocycle);

            logger.info("Macrociclo desactivado: {}", macrocycle.getName());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Macrociclo desactivado correctamente");
            response.put("macrocycle", macrocycle);

            response.put("stats", Map.of(
                    "customizationsDeleted", customizationCount,
                    "workoutsDisassociated", workoutSessionsCount
            ));

            StringBuilder userMessage = new StringBuilder("Macrociclo desactivado.");

            if (customizationCount > 0 || workoutSessionsCount > 0) {
                userMessage.append(" Se limpiaron ");
                if (customizationCount > 0) {
                    userMessage.append(customizationCount).append(" personalizaciones");
                    if (workoutSessionsCount > 0) {
                        userMessage.append(" y ").append(workoutSessionsCount).append(" entrenamientos");
                    }
                } else if (workoutSessionsCount > 0) {
                    userMessage.append(workoutSessionsCount).append(" entrenamientos");
                }
                userMessage.append(".");
            }

            response.put("userMessage", userMessage.toString());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error al desactivar macrociclo", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al desactivar el macrociclo"));
        }
    }

    @PutMapping("/{id}/reset")
    @Transactional
    public ResponseEntity<?> resetMacrocycle(@PathVariable Long id, @RequestBody Map<String, String> request) {
        logger.info("Reseteando macrociclo con ID: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);

            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para resetear este macrociclo"));
            }

            if (macrocycle.isArchived()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se puede resetear un macrociclo archivado"));
            }

            String newStartDateStr = request.get("newStartDate");
            if (newStartDateStr == null || newStartDateStr.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "La nueva fecha de inicio es obligatoria"));
            }

            LocalDate newStartDate;
            try {
                newStartDate = LocalDate.parse(newStartDateStr);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Formato de fecha inválido (usar YYYY-MM-DD)"));
            }

            long customizationCount = macrocycleDayCustomizationRepository.countByMacrocycle(macrocycle);

            long workoutCount = workoutSessionRepository.countByMacrocycle(macrocycle);

            if (customizationCount > 0) {
                macrocycleCustomizationService.resetAllCustomizations(macrocycle);
                logger.info("Eliminadas {} customizaciones durante reset", customizationCount);
            }

            if (workoutCount > 0) {
                workoutSessionRepository.dissociateMacrocycleFromUserSessions(usuario, macrocycle);
                logger.info("Desasociados {} entrenamientos durante reset", workoutCount);
            }

            LocalDate oldStartDate = macrocycle.getStartDate();
            macrocycle.setStartDate(newStartDate);

            boolean wasActive = macrocycle.isCurrentlyActive();

            Macrocycle updatedMacrocycle = macrocycleRepository.save(macrocycle);

            logger.info("Macrociclo {} reseteado: {} -> {}",
                    macrocycle.getName(), oldStartDate, newStartDate);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Macrociclo reseteado correctamente");
            response.put("macrocycle", updatedMacrocycle);
            response.put("oldStartDate", oldStartDate.toString());
            response.put("newStartDate", newStartDate.toString());
            response.put("resetStats", Map.of(
                    "customizationsDeleted", customizationCount,
                    "workoutsDisassociated", workoutCount,
                    "wasActive", wasActive
            ));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error al resetear macrociclo", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al resetear el macrociclo"));
        }
    }

    @PutMapping("/{id}/archive")
    @Transactional
    public ResponseEntity<?> archiveMacrocycle(@PathVariable Long id) {
        logger.info("Archivando macrociclo con ID: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);

            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para archivar este macrociclo"));
            }

            if (macrocycle.isArchived()) {
                return ResponseEntity.ok(Map.of("message", "Este macrociclo ya está archivado"));
            }

            if (macrocycle.isCurrentlyActive()) {
                macrocycle.setCurrentlyActive(false);
            }

            macrocycle.setArchived(true);
            macrocycleRepository.save(macrocycle);

            logger.info("Macrociclo archivado: {} (ID: {})", macrocycle.getName(), macrocycle.getId());

            return ResponseEntity.ok(Map.of(
                    "message", "Macrociclo archivado correctamente",
                    "macrocycle", macrocycle
            ));

        } catch (Exception e) {
            logger.error("Error al archivar macrociclo", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al archivar el macrociclo"));
        }
    }

    @PutMapping("/{id}/unarchive")
    @Transactional
    public ResponseEntity<?> unarchiveMacrocycle(@PathVariable Long id) {
        logger.info("Desarchivando macrociclo con ID: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            int activeMacrocycles = macrocycleRepository.countByCreatedByAndIsArchivedFalse(usuario);
            if (activeMacrocycles >= 3) {
                return ResponseEntity.badRequest().body(Map.of("error", "No puedes tener más de 3 macrociclos activos. Archiva uno primero."));
            }

            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);

            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para desarchivar este macrociclo"));
            }

            if (!macrocycle.isArchived()) {
                return ResponseEntity.ok(Map.of("message", "Este macrociclo no está archivado"));
            }

            macrocycle.setArchived(false);
            macrocycleRepository.save(macrocycle);

            logger.info("Macrociclo desarchivado: {} (ID: {})", macrocycle.getName(), macrocycle.getId());

            return ResponseEntity.ok(Map.of(
                    "message", "Macrociclo desarchivado correctamente",
                    "macrocycle", macrocycle
            ));

        } catch (Exception e) {
            logger.error("Error al desarchivar macrociclo", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al desarchivar el macrociclo"));
        }
    }

    @GetMapping("/{id}/day-plans")
    public ResponseEntity<?> getMacrocycleDayPlans(@PathVariable Long id) {
        logger.info("Solicitando planes diarios del macrociclo: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);

            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para ver este macrociclo"));
            }

            List<MacrocycleDayPlan> dayPlans = dayPlanRepository.findByMacrocycleOrderByDayNumber(macrocycle);

            List<Map<String, Object>> dayPlanDTOs = dayPlans.stream().map(plan -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("dayNumber", plan.getDayNumber());
                dto.put("isRestDay", plan.getIsRestDay());
                dto.put("routineId", plan.getRoutine() != null ? plan.getRoutine().getId() : null);
                dto.put("routineName", plan.getRoutine() != null ? plan.getRoutine().getName() : null);
                return dto;
            }).collect(Collectors.toList());

            logger.info("Devolviendo {} planes diarios para el macrociclo {}", dayPlanDTOs.size(), id);
            return ResponseEntity.ok(dayPlanDTOs);

        } catch (Exception e) {
            logger.error("Error al obtener planes diarios del macrociclo", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al obtener los planes diarios"));
        }
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createMacrocycle(@RequestBody CreateMacrocycleDTO macrocycleDTO) {
        logger.info("Creando nuevo macrociclo: {}", macrocycleDTO.getName());

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        int activeMacrocycles = macrocycleRepository.countByCreatedByAndIsArchivedFalse(usuario);
        if (activeMacrocycles >= 3) {
            return ResponseEntity.badRequest().body(Map.of("error", "No puedes tener más de 3 macrociclos activos. Archiva uno primero."));
        }

        if (macrocycleDTO.getName() == null || macrocycleDTO.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre es obligatorio"));
        }

        String trimmedName = macrocycleDTO.getName().trim();
        boolean nameExists = macrocycleRepository.existsByCreatedByAndNameIgnoreCase(usuario, trimmedName);
        if (nameExists) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Ya tienes un macrociclo con el nombre '" + trimmedName + "'. Por favor, elige un nombre diferente."
            ));
        }

        if (macrocycleDTO.getStartDate() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "La fecha de inicio es obligatoria"));
        }

        if (macrocycleDTO.getMicrocycleDurationDays() == null || macrocycleDTO.getMicrocycleDurationDays() < 1) {
            return ResponseEntity.badRequest().body(Map.of("error", "La duración del microciclo debe ser al menos 1 día"));
        }

        if (macrocycleDTO.getTotalMicrocycles() == null || macrocycleDTO.getTotalMicrocycles() < 1) {
            return ResponseEntity.badRequest().body(Map.of("error", "Debe haber al menos 1 microciclo"));
        }

        if (macrocycleDTO.getMicrocycleDurationDays() > 14) {
            return ResponseEntity.badRequest().body(Map.of("error", "Un microciclo no puede durar más de 14 días"));
        }

        if (macrocycleDTO.getTotalMicrocycles() > 52) {
            return ResponseEntity.badRequest().body(Map.of("error", "No puedes tener más de 52 microciclos"));
        }

        try {
            Macrocycle macrocycle = Macrocycle.builder()
                    .name(trimmedName)
                    .description(macrocycleDTO.getDescription())
                    .startDate(macrocycleDTO.getStartDate())
                    .microcycleDurationDays(macrocycleDTO.getMicrocycleDurationDays())
                    .totalMicrocycles(macrocycleDTO.getTotalMicrocycles())
                    .createdBy(usuario)
                    .isArchived(false)
                    .isCurrentlyActive(false)
                    .build();

            Macrocycle savedMacrocycle = macrocycleRepository.save(macrocycle);

            if (macrocycleDTO.getDayPlans() != null && !macrocycleDTO.getDayPlans().isEmpty()) {
                for (CreateMacrocycleDTO.DayPlanDTO dayPlan : macrocycleDTO.getDayPlans()) {
                    Routine routine = null;
                    if (dayPlan.getRoutineId() != null) {
                        routine = routineRepository.findById(dayPlan.getRoutineId()).orElse(null);
                    }

                    MacrocycleDayPlan plan = MacrocycleDayPlan.builder()
                            .macrocycle(savedMacrocycle)
                            .dayNumber(dayPlan.getDayNumber())
                            .routine(routine)
                            .isRestDay(dayPlan.getIsRestDay() != null && dayPlan.getIsRestDay())
                            .build();

                    dayPlanRepository.save(plan);
                }
            }

            logger.info("Macrociclo creado con ID: {} - Duración total: {} días",
                    savedMacrocycle.getId(), savedMacrocycle.getTotalDurationDays());

            return ResponseEntity.ok(savedMacrocycle);

        } catch (Exception e) {
            logger.error("Error al crear macrociclo", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al crear el macrociclo"));
        }
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateMacrocycle(@PathVariable Long id, @RequestBody CreateMacrocycleDTO macrocycleDTO) {
        logger.info("Actualizando macrociclo con ID: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);

            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para modificar este macrociclo"));
            }

            if (macrocycle.isArchived()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se puede modificar un macrociclo archivado"));
            }

            if (macrocycleDTO.getName() == null || macrocycleDTO.getName().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "El nombre es obligatorio"));
            }

            if (macrocycleDTO.getStartDate() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "La fecha de inicio es obligatoria"));
            }

            if (macrocycleDTO.getMicrocycleDurationDays() == null || macrocycleDTO.getMicrocycleDurationDays() < 1) {
                return ResponseEntity.badRequest().body(Map.of("error", "La duración del microciclo debe ser al menos 1 día"));
            }

            if (macrocycleDTO.getTotalMicrocycles() == null || macrocycleDTO.getTotalMicrocycles() < 1) {
                return ResponseEntity.badRequest().body(Map.of("error", "Debe haber al menos 1 microciclo"));
            }

            if (macrocycleDTO.getMicrocycleDurationDays() > 14) {
                return ResponseEntity.badRequest().body(Map.of("error", "Un microciclo no puede durar más de 14 días"));
            }

            if (macrocycleDTO.getTotalMicrocycles() > 52) {
                return ResponseEntity.badRequest().body(Map.of("error", "No puedes tener más de 52 microciclos"));
            }

            macrocycle.setName(macrocycleDTO.getName().trim());
            macrocycle.setDescription(macrocycleDTO.getDescription());
            macrocycle.setStartDate(macrocycleDTO.getStartDate());
            macrocycle.setMicrocycleDurationDays(macrocycleDTO.getMicrocycleDurationDays());
            macrocycle.setTotalMicrocycles(macrocycleDTO.getTotalMicrocycles());

            Macrocycle updatedMacrocycle = macrocycleRepository.save(macrocycle);

            logger.info("Macrociclo actualizado con ID: {} - Nuevo nombre: {}",
                    updatedMacrocycle.getId(), updatedMacrocycle.getName());

            return ResponseEntity.ok(updatedMacrocycle);

        } catch (Exception e) {
            logger.error("Error al actualizar macrociclo", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al actualizar el macrociclo"));
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteMacrocycle(@PathVariable Long id) {
        logger.info("Eliminando macrociclo con ID: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);

            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "No tienes permisos para eliminar este macrociclo"));
            }

            String macrocycleName = macrocycle.getName();


            long customizationCount = 0;
            long workoutSessionsCount = 0;

            if (macrocycle.isCurrentlyActive()) {
                logger.info("Macrociclo activo detectado, realizando limpieza como en deactivate...");

                // Contar customizaciones antes de eliminar
                customizationCount = macrocycleDayCustomizationRepository.countByMacrocycle(macrocycle);
                workoutSessionsCount = workoutSessionRepository.countByMacrocycle(macrocycle);

                // Eliminar customizaciones (igual que en deactivate)
                if (customizationCount > 0) {
                    macrocycleCustomizationService.resetAllCustomizations(macrocycle);
                    logger.info("Eliminadas {} customizaciones", customizationCount);
                }

                // Desasociar entrenamientos (igual que en deactivate)
                if (workoutSessionsCount > 0) {
                    workoutSessionRepository.dissociateMacrocycleFromUserSessions(usuario, macrocycle);
                    logger.info("Desasociados {} entrenamientos", workoutSessionsCount);
                }

                // Desactivar el macrociclo
                macrocycle.setCurrentlyActive(false);
                macrocycleRepository.save(macrocycle);
                logger.info("Macrociclo desactivado antes de eliminar");
            } else {
                // Si no está activo, aún puede tener customizaciones antiguas
                customizationCount = macrocycleDayCustomizationRepository.countByMacrocycle(macrocycle);
                workoutSessionsCount = workoutSessionRepository.countByMacrocycle(macrocycle);

                if (customizationCount > 0) {
                    macrocycleCustomizationService.resetAllCustomizations(macrocycle);
                    logger.info("Eliminadas {} customizaciones residuales", customizationCount);
                }

                if (workoutSessionsCount > 0) {
                    workoutSessionRepository.dissociateMacrocycleFromUserSessions(usuario, macrocycle);
                    logger.info("Desasociados {} entrenamientos residuales", workoutSessionsCount);
                }
            }

            // 🔥 PASO 2: Eliminar planes de día
            dayPlanRepository.deleteByMacrocycle(macrocycle);

            // 🔥 PASO 3: Finalmente eliminar el macrociclo
            macrocycleRepository.delete(macrocycle);
            logger.info("Macrociclo '{}' eliminado exitosamente", macrocycleName);

            // Construir mensaje informativo para el usuario
            StringBuilder userMessage = new StringBuilder("Macrociclo eliminado correctamente.");

            return ResponseEntity.ok(Map.of(
                    "message", userMessage.toString(),
                    "macrocycleName", macrocycleName
            ));

        } catch (Exception e) {
            logger.error("Error al eliminar macrociclo con ID: {}", id, e);
            return ResponseEntity.status(500).body(Map.of("error", "Error al eliminar el macrociclo"));
        }
    }

    @GetMapping("/{id}/days/{absoluteDay}")
    public ResponseEntity<?> getDayCustomization(
            @PathVariable Long id,
            @PathVariable Integer absoluteDay) {

        logger.info("Solicitando customización del día {} del macrociclo {}", absoluteDay, id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);
            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para ver este macrociclo"));
            }

            if (macrocycle.isArchived()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se puede ver un macrociclo archivado"));
            }

            DayCustomizationResponse response = macrocycleCustomizationService
                    .getDayCustomization(macrocycle, absoluteDay);

            logger.info("Día {} obtenido: {} - {} customizaciones",
                    absoluteDay, response.getRoutineName(), response.getTotalCustomizations());

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            logger.warn("Error de validación: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error obteniendo customización del día", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error interno del servidor"));
        }
    }

    @PutMapping("/{id}/days/{absoluteDay}/customize")
    public ResponseEntity<?> customizeDay(
            @PathVariable Long id,
            @PathVariable Integer absoluteDay,
            @RequestBody DayCustomizationRequest request) {

        logger.info("Customizando día {} del macrociclo {} - {} series",
                absoluteDay, id, request.getCustomizationCount());

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);
            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para modificar este macrociclo"));
            }

            if (macrocycle.isArchived()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se puede modificar un macrociclo archivado"));
            }

            if (!macrocycle.isCurrentlyActive()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Solo se pueden customizar macrociclos actualmente activos"));
            }

            if (!absoluteDay.equals(request.getAbsoluteDay())) {
                return ResponseEntity.badRequest().body(Map.of("error", "El día en la URL no coincide con el del cuerpo de la petición"));
            }

            if (!request.isValid()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Datos de customización inválidos"));
            }

            macrocycleCustomizationService.saveCustomizationsSelective(macrocycle, request);

            DayCustomizationResponse updatedResponse = macrocycleCustomizationService
                    .getDayCustomization(macrocycle, absoluteDay);

            logger.info("Día {} customizado exitosamente - {} customizaciones aplicadas",
                    absoluteDay, updatedResponse.getTotalCustomizations());

            return ResponseEntity.ok(Map.of(
                    "message", "Customizaciones guardadas exitosamente",
                    "day", updatedResponse
            ));

        } catch (IllegalArgumentException e) {
            logger.warn("Error de validación: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error guardando customizaciones", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error interno del servidor"));
        }
    }

    @DeleteMapping("/{id}/days/{absoluteDay}/customize")
    public ResponseEntity<?> resetDayCustomizations(
            @PathVariable Long id,
            @PathVariable Integer absoluteDay) {

        logger.info("Reseteando customizaciones del día {} del macrociclo {}", absoluteDay, id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);
            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para modificar este macrociclo"));
            }

            if (macrocycle.isArchived()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se puede modificar un macrociclo archivado"));
            }

            if (!macrocycle.isCurrentlyActive()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Solo se pueden resetear customizaciones de macrociclos actualmente activos"));
            }

            boolean hadCustomizations = macrocycleDayCustomizationRepository
                    .existsByMacrocycleAndAbsoluteDay(macrocycle, absoluteDay);

            if (!hadCustomizations) {
                return ResponseEntity.ok(Map.of(
                        "message", "El día no tenía customizaciones",
                        "hadCustomizations", false
                ));
            }

            macrocycleCustomizationService.resetDayCustomizations(macrocycle, absoluteDay);

            DayCustomizationResponse updatedResponse = macrocycleCustomizationService
                    .getDayCustomization(macrocycle, absoluteDay);

            logger.info("Customizaciones del día {} reseteadas exitosamente", absoluteDay);

            return ResponseEntity.ok(Map.of(
                    "message", "Customizaciones del día reseteadas exitosamente",
                    "hadCustomizations", true,
                    "day", updatedResponse
            ));

        } catch (IllegalArgumentException e) {
            logger.warn("Error de validación: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error reseteando customizaciones del día", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error interno del servidor"));
        }
    }

    @GetMapping("/{id}/customized-days")
    public ResponseEntity<?> getCustomizedDays(@PathVariable Long id) {

        logger.info("Solicitando días customizados del macrociclo {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);
            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para ver este macrociclo"));
            }

            List<Integer> customizedDays = macrocycleCustomizationService.getCustomizedDays(macrocycle);

            long totalCustomizations = macrocycleDayCustomizationRepository.countByMacrocycle(macrocycle);

            logger.info("Macrociclo {} tiene {} días customizados con {} customizaciones totales",
                    id, customizedDays.size(), totalCustomizations);

            return ResponseEntity.ok(Map.of(
                    "customizedDays", customizedDays,
                    "totalCustomizedDays", customizedDays.size(),
                    "totalCustomizations", totalCustomizations,
                    "macrocycleId", id,
                    "macrocycleName", macrocycle.getName()
            ));

        } catch (Exception e) {
            logger.error("Error obteniendo días customizados", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error interno del servidor"));
        }
    }

    @GetMapping("/{id}/customization-stats")
    public ResponseEntity<?> getCustomizationStats(@PathVariable Long id) {

        logger.info("Solicitando estadísticas de customización del macrociclo {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);
            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para ver este macrociclo"));
            }

            List<Object[]> dayCustomizationCounts = macrocycleDayCustomizationRepository
                    .findDayCustomizationCounts(macrocycle);

            List<Map<String, Object>> dayStats = dayCustomizationCounts.stream()
                    .map(result -> Map.of(
                            "absoluteDay", result[0],
                            "customizationCount", result[1]
                    ))
                    .collect(Collectors.toList());

            long totalCustomizations = macrocycleDayCustomizationRepository.countByMacrocycle(macrocycle);
            Integer totalDays = macrocycle.getTotalDurationDays();
            int customizedDaysCount = dayCustomizationCounts.size();

            return ResponseEntity.ok(Map.of(
                    "macrocycleId", id,
                    "macrocycleName", macrocycle.getName(),
                    "totalDays", totalDays != null ? totalDays : 0,
                    "customizedDaysCount", customizedDaysCount,
                    "totalCustomizations", totalCustomizations,
                    "customizationPercentage", totalDays != null && totalDays > 0 ?
                            Math.round((customizedDaysCount * 100.0) / totalDays) : 0,
                    "dayStats", dayStats
            ));

        } catch (Exception e) {
            logger.error("Error obteniendo estadísticas de customización", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error interno del servidor"));
        }
    }

    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElse(null);
    }
}