package com.example.demo.rest;

import com.example.demo.dto.CreateMacrocycleDTO;
import com.example.demo.model.Macrocycle;
import com.example.demo.model.MacrocycleDayPlan;
import com.example.demo.model.Routine;
import com.example.demo.model.Usuario;
import com.example.demo.repository.MacrocycleRepository;
import com.example.demo.repository.MacrocycleDayPlanRepository;
import com.example.demo.repository.RoutineRepository;
import com.example.demo.repository.UsuarioRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/macrocycles")
public class MacrocycleController {

    private static final Logger logger = LoggerFactory.getLogger(MacrocycleController.class);

    private final MacrocycleRepository macrocycleRepository;
    private final MacrocycleDayPlanRepository dayPlanRepository;
    private final RoutineRepository routineRepository;
    private final UsuarioRepository usuarioRepository;

    public MacrocycleController(
            MacrocycleRepository macrocycleRepository,
            MacrocycleDayPlanRepository dayPlanRepository,
            RoutineRepository routineRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.macrocycleRepository = macrocycleRepository;
        this.dayPlanRepository = dayPlanRepository;
        this.routineRepository = routineRepository;
        this.usuarioRepository = usuarioRepository;
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

    // Obtener el macrociclo actualmente activo
    @GetMapping("/active")
    public ResponseEntity<?> getActiveMacrocycle() {
        logger.info("Solicitando macrociclo actualmente activo");

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        Optional<Macrocycle> activeMacrocycle = macrocycleRepository.findByCreatedByAndIsCurrentlyActiveTrue(usuario);

        if (activeMacrocycle.isEmpty()) {
            return ResponseEntity.ok(Map.of("message", "No hay macrociclo activo", "activeMacrocycle", null));
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

    // Desactivar el macrociclo actualmente activo
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
            macrocycle.setCurrentlyActive(false);
            macrocycleRepository.save(macrocycle);

            logger.info("Macrociclo desactivado: {} (ID: {})", macrocycle.getName(), macrocycle.getId());

            return ResponseEntity.ok(Map.of(
                    "message", "Macrociclo desactivado correctamente",
                    "macrocycle", macrocycle
            ));

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

    // Método auxiliar para obtener usuario actual
    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElse(null);
    }
}