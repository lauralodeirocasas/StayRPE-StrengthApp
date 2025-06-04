package com.example.demo.rest;

import com.example.demo.dto.CreateMacrocycleDTO;
import com.example.demo.dto.DayCustomizationRequest;
import com.example.demo.dto.DayCustomizationResponse;
import com.example.demo.model.Macrocycle;
import com.example.demo.model.MacrocycleDayPlan;
import com.example.demo.model.Routine;
import com.example.demo.model.Usuario;
import com.example.demo.repository.*;
import com.example.demo.service.MacrocycleCustomizationService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

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

    // 🔥 NUEVAS DEPENDENCIAS PARA CUSTOMIZACIÓN
    private final MacrocycleCustomizationService macrocycleCustomizationService;
    private final MacrocycleDayCustomizationRepository macrocycleDayCustomizationRepository;

    // 🔥 CONSTRUCTOR ACTUALIZADO
    public MacrocycleController(
            MacrocycleRepository macrocycleRepository,
            MacrocycleDayPlanRepository dayPlanRepository,
            RoutineRepository routineRepository,
            UsuarioRepository usuarioRepository,
            MacrocycleCustomizationService macrocycleCustomizationService,
            MacrocycleDayCustomizationRepository macrocycleDayCustomizationRepository
    ) {
        this.macrocycleRepository = macrocycleRepository;
        this.dayPlanRepository = dayPlanRepository;
        this.routineRepository = routineRepository;
        this.usuarioRepository = usuarioRepository;
        this.macrocycleCustomizationService = macrocycleCustomizationService;
        this.macrocycleDayCustomizationRepository = macrocycleDayCustomizationRepository;
    }

    // CAMBIO: Obtener todos los macrociclos activos (no archivados) del usuario
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

    // NUEVO: Obtener macrociclos archivados
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
            // 🔥 FIX: Usar HashMap en lugar de Map.of() para permitir null
            Map<String, Object> response = new HashMap<>();
            response.put("message", "No hay macrociclo activo");
            response.put("activeMacrocycle", null);

            logger.info("No hay macrociclo activo para el usuario: {}", usuario.getUsername());
            return ResponseEntity.ok(response);
        }

        logger.info("Macrociclo activo encontrado: {}", activeMacrocycle.get().getName());
        return ResponseEntity.ok(Map.of("activeMacrocycle", activeMacrocycle.get()));
    }

    // Activar un macrociclo específico
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

            // Verificar que el macrociclo pertenece al usuario actual
            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para activar este macrociclo"));
            }

            // CAMBIO: Verificar que el macrociclo no esté archivado
            if (macrocycle.isArchived()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se puede activar un macrociclo archivado"));
            }

            // Si ya está activo, no hacer nada
            if (macrocycle.isCurrentlyActive()) {
                return ResponseEntity.ok(Map.of(
                        "message", "Este macrociclo ya está activo",
                        "macrocycle", macrocycle
                ));
            }

            // Desactivar todos los macrociclos del usuario
            macrocycleRepository.deactivateAllMacrocycles(usuario);

            // Activar el macrociclo seleccionado
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

    /**
     * 🔥 MODIFICADO: Desactiva el macrociclo actualmente activo.
     * Ahora borra automáticamente todas las customizaciones.
     */
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

            // 🔥 NUEVO: Verificar si hay customizaciones antes de borrar
            long customizationCount = macrocycleDayCustomizationRepository.countByMacrocycle(macrocycle);
            List<Integer> customizedDays = Collections.emptyList();

            if (customizationCount > 0) {
                logger.info("El macrociclo {} tiene {} customizaciones que serán eliminadas",
                        macrocycle.getName(), customizationCount);

                // Obtener lista de días customizados para informar al usuario
                customizedDays = macrocycleCustomizationService.getCustomizedDays(macrocycle);

                // 🔥 NUEVO: Borrar todas las customizaciones usando el servicio
                macrocycleCustomizationService.resetAllCustomizations(macrocycle);

                logger.info("Se eliminaron {} customizaciones de {} días",
                        customizationCount, customizedDays.size());
            }

            // Desactivar el macrociclo (código original)
            macrocycle.setCurrentlyActive(false);
            macrocycleRepository.save(macrocycle);

            logger.info("Macrociclo desactivado: {} (ID: {})", macrocycle.getName(), macrocycle.getId());

            // 🔥 MEJORADO: Response más informativa incluyendo info de customizaciones
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Macrociclo desactivado correctamente");
            response.put("macrocycle", macrocycle);

            // Información sobre customizaciones eliminadas
            if (customizationCount > 0) {
                response.put("customizationsDeleted", true);
                response.put("deletedCustomizationsCount", customizationCount);
                response.put("customizedDaysCount", customizedDays.size());
                response.put("customizedDays", customizedDays);
                response.put("customizationMessage",
                        String.format("Se eliminaron %d customizaciones de %d días. " +
                                        "Si reactivas este macrociclo, empezará con las rutinas originales.",
                                customizationCount, customizedDays.size()));
            } else {
                response.put("customizationsDeleted", false);
                response.put("deletedCustomizationsCount", 0);
                response.put("customizationMessage", "No había customizaciones para eliminar");
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error al desactivar macrociclo", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al desactivar el macrociclo"));
        }
    }

    // NUEVO: Archivar macrociclo (reemplaza eliminación)
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

            // Verificar que el macrociclo pertenece al usuario actual
            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para archivar este macrociclo"));
            }

            // Si ya está archivado, no hacer nada
            if (macrocycle.isArchived()) {
                return ResponseEntity.ok(Map.of("message", "Este macrociclo ya está archivado"));
            }

            // Si está actualmente activo, desactivarlo
            if (macrocycle.isCurrentlyActive()) {
                macrocycle.setCurrentlyActive(false);
            }

            // Archivar el macrociclo
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

    // NUEVO: Desarchivar macrociclo
    @PutMapping("/{id}/unarchive")
    @Transactional
    public ResponseEntity<?> unarchiveMacrocycle(@PathVariable Long id) {
        logger.info("Desarchivando macrociclo con ID: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            // Verificar límite de 3 macrociclos activos antes de desarchivar
            int activeMacrocycles = macrocycleRepository.countByCreatedByAndIsArchivedFalse(usuario);
            if (activeMacrocycles >= 3) {
                return ResponseEntity.badRequest().body(Map.of("error", "No puedes tener más de 3 macrociclos activos. Archiva uno primero."));
            }

            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);

            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            // Verificar que el macrociclo pertenece al usuario actual
            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para desarchivar este macrociclo"));
            }

            // Si no está archivado, no hacer nada
            if (!macrocycle.isArchived()) {
                return ResponseEntity.ok(Map.of("message", "Este macrociclo no está archivado"));
            }

            // Desarchivar el macrociclo
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

    // Obtener los planes diarios de un macrociclo
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

            // Verificar que el macrociclo pertenece al usuario actual
            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para ver este macrociclo"));
            }

            // Obtener los planes diarios
            List<MacrocycleDayPlan> dayPlans = dayPlanRepository.findByMacrocycleOrderByDayNumber(macrocycle);

            // Convertir a DTO para enviar al frontend
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

    // Crear nuevo macrociclo
    @PostMapping
    @Transactional
    public ResponseEntity<?> createMacrocycle(@RequestBody CreateMacrocycleDTO macrocycleDTO) {
        logger.info("Creando nuevo macrociclo: {}", macrocycleDTO.getName());

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        // CAMBIO: Verificar límite de 3 macrociclos activos (no archivados)
        int activeMacrocycles = macrocycleRepository.countByCreatedByAndIsArchivedFalse(usuario);
        if (activeMacrocycles >= 3) {
            return ResponseEntity.badRequest().body(Map.of("error", "No puedes tener más de 3 macrociclos activos. Archiva uno primero."));
        }

        // Validaciones básicas
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

        // Validación adicional: máximo razonable
        if (macrocycleDTO.getMicrocycleDurationDays() > 14) {
            return ResponseEntity.badRequest().body(Map.of("error", "Un microciclo no puede durar más de 14 días"));
        }

        if (macrocycleDTO.getTotalMicrocycles() > 52) {
            return ResponseEntity.badRequest().body(Map.of("error", "No puedes tener más de 52 microciclos"));
        }

        try {
            Macrocycle macrocycle = Macrocycle.builder()
                    .name(macrocycleDTO.getName())
                    .description(macrocycleDTO.getDescription())
                    .startDate(macrocycleDTO.getStartDate())
                    .microcycleDurationDays(macrocycleDTO.getMicrocycleDurationDays())
                    .totalMicrocycles(macrocycleDTO.getTotalMicrocycles())
                    .createdBy(usuario)
                    .isArchived(false) // CAMBIO: Por defecto no archivado
                    .isCurrentlyActive(false) // Por defecto no está activo
                    .build();

            Macrocycle savedMacrocycle = macrocycleRepository.save(macrocycle);

            // Crear la planificación diaria si está presente
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

    // Actualizar macrociclo existente
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

            // Verificar que el macrociclo pertenece al usuario actual
            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para modificar este macrociclo"));
            }

            // NUEVO: Verificar que no esté archivado
            if (macrocycle.isArchived()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se puede modificar un macrociclo archivado"));
            }

            // Validaciones básicas
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

            // Validación adicional: máximo razonable
            if (macrocycleDTO.getMicrocycleDurationDays() > 14) {
                return ResponseEntity.badRequest().body(Map.of("error", "Un microciclo no puede durar más de 14 días"));
            }

            if (macrocycleDTO.getTotalMicrocycles() > 52) {
                return ResponseEntity.badRequest().body(Map.of("error", "No puedes tener más de 52 microciclos"));
            }

            // Actualizar los campos del macrociclo
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

    // Eliminación física directa
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
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            // Verificar que el macrociclo pertenece al usuario actual
            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para eliminar este macrociclo"));
            }

            // Eliminar primero los planes diarios
            dayPlanRepository.deleteByMacrocycle(macrocycle);

            // Eliminar el macrociclo
            macrocycleRepository.delete(macrocycle);
            logger.info("Macrociclo eliminado: {}", macrocycle.getName());

            return ResponseEntity.ok(Map.of("message", "Macrociclo eliminado correctamente"));

        } catch (Exception e) {
            logger.error("Error al eliminar macrociclo", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al eliminar el macrociclo"));
        }
    }

    // =========================================================================
    // 🔥 NUEVOS ENDPOINTS PARA CUSTOMIZACIÓN DE DÍAS
    // =========================================================================

    /**
     * Obtiene la información completa de un día específico con customizaciones.
     *
     * GET /macrocycles/{id}/days/{absoluteDay}
     *
     * Ejemplo: GET /macrocycles/5/days/15
     * Response: Información del día 15 con rutina original + customizaciones
     */
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
            // Verificar que el macrociclo existe y pertenece al usuario
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);
            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            // Verificar permisos
            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para ver este macrociclo"));
            }

            // Verificar que el macrociclo está activo (no archivado)
            if (macrocycle.isArchived()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se puede ver un macrociclo archivado"));
            }

            // Obtener la customización del día
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

    /**
     * Actualiza las customizaciones de un día específico.
     *
     * PUT /macrocycles/{id}/days/{absoluteDay}/customize
     *
     * Ejemplo: PUT /macrocycles/5/days/15/customize
     * Body: DayCustomizationRequest con las series a modificar
     */
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
            // Verificar macrociclo
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);
            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            // Verificar permisos
            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para modificar este macrociclo"));
            }

            // Verificar que el macrociclo está activo
            if (macrocycle.isArchived()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se puede modificar un macrociclo archivado"));
            }

            // IMPORTANTE: Solo se puede customizar macrociclos actualmente activos
            if (!macrocycle.isCurrentlyActive()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Solo se pueden customizar macrociclos actualmente activos"));
            }

            // Validar que el absoluteDay en la URL coincide con el del body
            if (!absoluteDay.equals(request.getAbsoluteDay())) {
                return ResponseEntity.badRequest().body(Map.of("error", "El día en la URL no coincide con el del cuerpo de la petición"));
            }

            // Validar request
            if (!request.isValid()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Datos de customización inválidos"));
            }

            // 🔥 FIX: Usar el método corregido del servicio
            macrocycleCustomizationService.saveCustomizationsSelective(macrocycle, request);

            // Obtener la response actualizada
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

    /**
     * Resetea todas las customizaciones de un día específico.
     *
     * DELETE /macrocycles/{id}/days/{absoluteDay}/customize
     *
     * Ejemplo: DELETE /macrocycles/5/days/15/customize
     * Response: Confirmación de reset + día actualizado
     */
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
            // Verificar macrociclo
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);
            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            // Verificar permisos
            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para modificar este macrociclo"));
            }

            // Verificar que el macrociclo está activo
            if (macrocycle.isArchived()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se puede modificar un macrociclo archivado"));
            }

            // Verificar que está actualmente activo
            if (!macrocycle.isCurrentlyActive()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Solo se pueden resetear customizaciones de macrociclos actualmente activos"));
            }

            // Verificar si el día tiene customizaciones antes de resetear
            boolean hadCustomizations = macrocycleDayCustomizationRepository
                    .existsByMacrocycleAndAbsoluteDay(macrocycle, absoluteDay);

            if (!hadCustomizations) {
                return ResponseEntity.ok(Map.of(
                        "message", "El día no tenía customizaciones",
                        "hadCustomizations", false
                ));
            }

            // Resetear customizaciones
            macrocycleCustomizationService.resetDayCustomizations(macrocycle, absoluteDay);

            // Obtener el día actualizado (ahora sin customizaciones)
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

    /**
     * Obtiene la lista de días que tienen customizaciones en un macrociclo.
     *
     * GET /macrocycles/{id}/customized-days
     *
     * Ejemplo: GET /macrocycles/5/customized-days
     * Response: [15, 22, 37] - Lista de días absolutos con customizaciones
     */
    @GetMapping("/{id}/customized-days")
    public ResponseEntity<?> getCustomizedDays(@PathVariable Long id) {

        logger.info("Solicitando días customizados del macrociclo {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            // Verificar macrociclo
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);
            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            // Verificar permisos
            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para ver este macrociclo"));
            }

            // Obtener días customizados
            List<Integer> customizedDays = macrocycleCustomizationService.getCustomizedDays(macrocycle);

            // Obtener estadísticas adicionales
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

    /**
     * Obtiene estadísticas detalladas de customizaciones por día.
     *
     * GET /macrocycles/{id}/customization-stats
     *
     * Endpoint adicional para obtener estadísticas más detalladas.
     * Útil para mostrar gráficos o análisis en el frontend.
     */
    @GetMapping("/{id}/customization-stats")
    public ResponseEntity<?> getCustomizationStats(@PathVariable Long id) {

        logger.info("Solicitando estadísticas de customización del macrociclo {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            // Verificar macrociclo
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);
            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            // Verificar permisos
            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para ver este macrociclo"));
            }

            // Obtener estadísticas detalladas
            List<Object[]> dayCustomizationCounts = macrocycleDayCustomizationRepository
                    .findDayCustomizationCounts(macrocycle);

            // Construir respuesta con estadísticas
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

    // Método auxiliar para obtener usuario actual
    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElse(null);
    }
}