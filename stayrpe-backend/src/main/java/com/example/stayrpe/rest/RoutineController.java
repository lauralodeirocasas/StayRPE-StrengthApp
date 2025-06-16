package com.example.stayrpe.rest;

import com.example.stayrpe.dto.*;
import com.example.stayrpe.model.*;
import com.example.stayrpe.repository.*;

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
@RequestMapping("/routines")
public class RoutineController {

    private static final Logger logger = LoggerFactory.getLogger(RoutineController.class);

    private final RoutineRepository routineRepository;
    private final RoutineExerciseRepository routineExerciseRepository;
    private final ExerciseSetRepository exerciseSetRepository;
    private final ExerciseRepository exerciseRepository;
    private final UsuarioRepository usuarioRepository;
    private final MacrocycleDayPlanRepository macrocycleDayPlanRepository;

    public RoutineController(
            RoutineRepository routineRepository,
            RoutineExerciseRepository routineExerciseRepository,
            ExerciseSetRepository exerciseSetRepository,
            ExerciseRepository exerciseRepository,
            UsuarioRepository usuarioRepository,
            MacrocycleDayPlanRepository macrocycleDayPlanRepository
    ) {
        this.routineRepository = routineRepository;
        this.routineExerciseRepository = routineExerciseRepository;
        this.exerciseSetRepository = exerciseSetRepository;
        this.exerciseRepository = exerciseRepository;
        this.usuarioRepository = usuarioRepository;
        this.macrocycleDayPlanRepository = macrocycleDayPlanRepository;
    }

    @GetMapping
    public ResponseEntity<List<RoutineListResponse>> getUserRoutines() {
        logger.info("Solicitando rutinas del usuario");

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().build();
        }

        List<Routine> routines = routineRepository.findByCreatedByAndIsActiveTrue(usuario);

        List<RoutineListResponse> response = routines.stream()
                .map(this::convertToListResponse)
                .collect(Collectors.toList());

        logger.info("Devolviendo {} rutinas", response.size());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoutineResponse> getRoutineById(@PathVariable Long id) {
        logger.info("Solicitando rutina con ID: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().build();
        }

        Optional<Routine> routineOpt = routineRepository.findById(id);
        if (routineOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Routine routine = routineOpt.get();

        if (!routine.getCreatedBy().getId().equals(usuario.getId())) {
            return ResponseEntity.status(403).build();
        }

        RoutineResponse response = convertToFullResponse(routine);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createRoutine(@RequestBody CreateRoutineDTO routineDTO) {
        logger.info("Creando nueva rutina: {}", routineDTO.getName());

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        if (routineDTO.getName() == null || routineDTO.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre es obligatorio"));
        }

        String trimmedName = routineDTO.getName().trim();
        boolean nameExists = routineRepository.existsByCreatedByAndNameIgnoreCaseAndIsActiveTrue(usuario, trimmedName);
        if (nameExists) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Ya tienes una rutina con el nombre '" + trimmedName + "'. Por favor, elige un nombre diferente."
            ));
        }

        try {
            Routine routine = Routine.builder()
                    .name(trimmedName)
                    .description(routineDTO.getDescription())
                    .createdBy(usuario)
                    .isActive(true)
                    .build();

            Routine savedRoutine = routineRepository.save(routine);

            if (routineDTO.getExercises() != null && !routineDTO.getExercises().isEmpty()) {
                for (CreateRoutineExerciseDTO exerciseDTO : routineDTO.getExercises()) {
                    createRoutineExercise(savedRoutine, exerciseDTO);
                }
            }

            logger.info("Rutina creada con ID: {}", savedRoutine.getId());

            RoutineResponse response = convertToFullResponse(savedRoutine);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error al crear rutina", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al crear la rutina: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateRoutine(@PathVariable Long id, @RequestBody CreateRoutineDTO routineDTO) {
        logger.info("Actualizando rutina con ID: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        Optional<Routine> routineOpt = routineRepository.findById(id);
        if (routineOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Routine routine = routineOpt.get();

        if (!routine.getCreatedBy().getId().equals(usuario.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No tienes permisos para modificar esta rutina"));
        }


        long activeMacrocyclesUsingRoutine = macrocycleDayPlanRepository.countByRoutineAndMacrocycleIsArchivedFalse(routine);

        if (activeMacrocyclesUsingRoutine > 0) {
            List<Macrocycle> activeMacrocycles = macrocycleDayPlanRepository.findActiveMacrocyclesByRoutine(routine);

            String macrocycleNames = activeMacrocycles.stream()
                    .map(Macrocycle::getName)
                    .collect(Collectors.joining(", "));

            String errorMessage;
            if (activeMacrocyclesUsingRoutine == 1) {
                errorMessage = String.format(
                        "No se puede editar la rutina \"%s\" porque está siendo utilizada en el macrociclo activo \"%s\". " +
                                "Para editarla, primero archiva o desactiva el macrociclo, o duplica la rutina para crear una nueva versión.",
                        routine.getName(),
                        macrocycleNames
                );
            } else {
                errorMessage = String.format(
                        "No se puede editar la rutina \"%s\" porque está siendo utilizada en %d macrociclos activos: %s. " +
                                "Para editarla, primero archiva o desactiva estos macrociclos, o duplica la rutina para crear una nueva versión.",
                        routine.getName(),
                        activeMacrocyclesUsingRoutine,
                        macrocycleNames
                );
            }

            logger.warn("Intento de editar rutina {} que está en uso en {} macrociclo(s) activo(s): {}",
                    routine.getName(), activeMacrocyclesUsingRoutine, macrocycleNames);

            return ResponseEntity.status(409).body(Map.of(
                    "error", errorMessage,
                    "errorCode", "ROUTINE_IN_USE",
                    "routineName", routine.getName(),
                    "activeMacrocycles", activeMacrocyclesUsingRoutine,
                    "macrocycleDetails", activeMacrocycles.stream()
                            .map(m -> Map.of(
                                    "id", m.getId(),
                                    "name", m.getName(),
                                    "isCurrentlyActive", m.isCurrentlyActive(),
                                    "startDate", m.getStartDate(),
                                    "endDate", m.getEndDate() != null ? m.getEndDate() : "En curso"
                            ))
                            .collect(Collectors.toList()),
                    "canEdit", false,
                    "suggestions", List.of(
                            "Duplicar la rutina para crear una nueva versión",
                            "Archivar temporalmente los macrociclos que la usan",
                            "Desactivar los macrociclos activos",
                            "Esperar a que terminen los macrociclos"
                    )
            ));
        }

        if (routineDTO.getName() == null || routineDTO.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre es obligatorio"));
        }

        String trimmedName = routineDTO.getName().trim();
        if (!trimmedName.equalsIgnoreCase(routine.getName())) {
            boolean nameExists = routineRepository.existsByCreatedByAndNameIgnoreCaseAndIsActiveTrue(usuario, trimmedName);
            if (nameExists) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Ya tienes una rutina con el nombre '" + trimmedName + "'. Por favor, elige un nombre diferente."
                ));
            }
        }

        try {
            routine.setName(trimmedName);
            routine.setDescription(routineDTO.getDescription());

            // Como no está en macrociclos activos, podemos proceder normalmente
            routineExerciseRepository.deleteByRoutineId(routine.getId());

            if (routineDTO.getExercises() != null && !routineDTO.getExercises().isEmpty()) {
                for (CreateRoutineExerciseDTO exerciseDTO : routineDTO.getExercises()) {
                    createRoutineExercise(routine, exerciseDTO);
                }
            }

            Routine savedRoutine = routineRepository.save(routine);
            logger.info("Rutina actualizada correctamente: {}", savedRoutine.getName());

            RoutineResponse response = convertToFullResponse(savedRoutine);
            return ResponseEntity.ok(Map.of(
                    "routine", response,
                    "message", "Rutina actualizada correctamente",
                    "updated", true
            ));

        } catch (Exception e) {
            logger.error("Error al actualizar rutina", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al actualizar la rutina: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteRoutine(@PathVariable Long id) {
        logger.info("Eliminando rutina con ID: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Routine> routineOpt = routineRepository.findById(id);

            if (routineOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Rutina no encontrada"));
            }

            Routine routine = routineOpt.get();

            if (!routine.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "No tienes permisos para eliminar esta rutina"));
            }

            long allMacrocyclesUsingRoutine = macrocycleDayPlanRepository.countByRoutine(routine);

            if (allMacrocyclesUsingRoutine > 0) {
                long activeMacrocyclesUsingRoutine = macrocycleDayPlanRepository.countByRoutineAndMacrocycleIsArchivedFalse(routine);
                long archivedMacrocyclesUsingRoutine = allMacrocyclesUsingRoutine - activeMacrocyclesUsingRoutine;

                String errorMessage;
                if (activeMacrocyclesUsingRoutine > 0 && archivedMacrocyclesUsingRoutine > 0) {
                    errorMessage = String.format(
                            "No se puede eliminar la rutina \"%s\" porque está siendo utilizada en  macrociclo(s) activo(s) y  archivado(s). " +
                                    "Para eliminarla, primero debes quitarla de todos los macrociclos que la usan.",
                            routine.getName()
                    );
                } else if (activeMacrocyclesUsingRoutine > 0) {
                    errorMessage = String.format(
                            "No se puede eliminar la rutina \"%s\" porque está siendo utilizada en  macrociclo(s) activo(s). " +
                                    "Para eliminarla, primero archiva o elimina los macrociclos que la usan.",
                            routine.getName()
                    );
                } else {
                    errorMessage = String.format(
                            "No se puede eliminar la rutina \"%s\" porque está siendo utilizada en macrociclo(s) archivado(s). " +
                                    "Para eliminarla, primero debes eliminar definitivamente los macrociclos archivados que la usan.",
                            routine.getName()
                    );
                }

                logger.warn("Intento de eliminar rutina {} que está en uso en {} macrociclo(s) total",
                        routine.getName(), allMacrocyclesUsingRoutine);

                return ResponseEntity.status(409).body(Map.of(
                        "error", errorMessage,
                        "routineName", routine.getName(),
                        "totalMacrocycles", allMacrocyclesUsingRoutine,
                        "activeMacrocycles", activeMacrocyclesUsingRoutine,
                        "archivedMacrocycles", archivedMacrocyclesUsingRoutine
                ));
            }

            if (!routine.isActive()) {
                return ResponseEntity.badRequest().body(Map.of("error", "La rutina ya está eliminada"));
            }

            routine.setActive(false);
            routineRepository.save(routine);

            logger.info("Rutina marcada como inactiva: {} (ID: {})", routine.getName(), routine.getId());
            return ResponseEntity.ok(Map.of(
                    "message", "Rutina eliminada correctamente",
                    "routineName", routine.getName()
            ));

        } catch (Exception e) {
            logger.error("Error al eliminar rutina", e);
            return ResponseEntity.status(500).body(Map.of("error", "Error interno del servidor"));
        }
    }


    @GetMapping("/{id}/editable")
    public ResponseEntity<?> checkIfRoutineIsEditable(@PathVariable Long id) {
        logger.info("Verificando si la rutina {} es editable", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        Optional<Routine> routineOpt = routineRepository.findById(id);
        if (routineOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Routine routine = routineOpt.get();

        if (!routine.getCreatedBy().getId().equals(usuario.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No tienes permisos para ver esta rutina"));
        }

        if (!routine.isActive()) {
            return ResponseEntity.ok(Map.of(
                    "editable", false,
                    "reason", "La rutina está eliminada",
                    "canEdit", false,
                    "status", "DELETED"
            ));
        }


        long activeMacrocyclesUsingRoutine = macrocycleDayPlanRepository.countByRoutineAndMacrocycleIsArchivedFalse(routine);

        if (activeMacrocyclesUsingRoutine > 0) {
            List<Macrocycle> activeMacrocycles = macrocycleDayPlanRepository.findActiveMacrocyclesByRoutine(routine);

            return ResponseEntity.ok(Map.of(
                    "editable", false,
                    "reason", "La rutina está siendo utilizada en macrociclos activos",
                    "status", "IN_USE",
                    "activeMacrocycles", activeMacrocyclesUsingRoutine,
                    "macrocycles", activeMacrocycles.stream()
                            .map(m -> Map.of(
                                    "id", m.getId(),
                                    "name", m.getName(),
                                    "isCurrentlyActive", m.isCurrentlyActive(),
                                    "startDate", m.getStartDate(),
                                    "endDate", m.getEndDate() != null ? m.getEndDate() : "En curso"
                            ))
                            .collect(Collectors.toList()),
                    "canEdit", false,
                    "suggestions", List.of(
                            "Duplicar la rutina para crear una nueva versión",
                            "Archivar temporalmente los macrociclos que la usan",
                            "Desactivar los macrociclos activos"
                    )
            ));
        }


        long totalMacrocycles = macrocycleDayPlanRepository.countByRoutine(routine);
        long archivedMacrocyclesUsingRoutine = totalMacrocycles - activeMacrocyclesUsingRoutine;

        Map<String, Object> response = new HashMap<>();
        response.put("editable", true);
        response.put("canEdit", true);
        response.put("status", "AVAILABLE");
        response.put("activeMacrocycles", 0);
        response.put("archivedMacrocycles", archivedMacrocyclesUsingRoutine);

        if (archivedMacrocyclesUsingRoutine > 0) {
            response.put("info", String.format(
                    "Esta rutina fue utilizada en %d macrociclo(s) archivado(s), pero se puede editar libremente.",
                    archivedMacrocyclesUsingRoutine
            ));
        }

        return ResponseEntity.ok(response);
    }


    @PostMapping("/{id}/duplicate")
    @Transactional
    public ResponseEntity<?> duplicateRoutine(@PathVariable Long id, @RequestBody(required = false) Map<String, String> request) {
        logger.info("Duplicando rutina con ID: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        Optional<Routine> originalRoutineOpt = routineRepository.findById(id);
        if (originalRoutineOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Routine originalRoutine = originalRoutineOpt.get();

        if (!originalRoutine.getCreatedBy().getId().equals(usuario.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No tienes permisos para duplicar esta rutina"));
        }

        try {
            // Generar nombre para la copia
            String newName;
            if (request != null && request.containsKey("name") && !request.get("name").trim().isEmpty()) {
                newName = request.get("name").trim();
            } else {
                newName = generateDuplicateName(originalRoutine.getName(), usuario);
            }

            // Verificar que el nombre no exista
            boolean nameExists = routineRepository.existsByCreatedByAndNameIgnoreCaseAndIsActiveTrue(usuario, newName);
            if (nameExists) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Ya tienes una rutina con el nombre '" + newName + "'. Por favor, elige un nombre diferente."
                ));
            }

            // Crear la rutina duplicada
            Routine duplicatedRoutine = Routine.builder()
                    .name(newName)
                    .description(originalRoutine.getDescription())
                    .createdBy(usuario)
                    .isActive(true)
                    .build();

            Routine savedDuplicatedRoutine = routineRepository.save(duplicatedRoutine);

            // Duplicar los ejercicios y series
            List<RoutineExercise> originalExercises = routineExerciseRepository.findByRoutineIdOrderByOrder(originalRoutine.getId());

            for (RoutineExercise originalExercise : originalExercises) {
                RoutineExercise duplicatedExercise = RoutineExercise.builder()
                        .routine(savedDuplicatedRoutine)
                        .exercise(originalExercise.getExercise())
                        .order(originalExercise.getOrder())
                        .numberOfSets(originalExercise.getNumberOfSets())
                        .restBetweenSets(originalExercise.getRestBetweenSets())
                        .notes(originalExercise.getNotes())
                        .build();

                RoutineExercise savedDuplicatedExercise = routineExerciseRepository.save(duplicatedExercise);

                // Duplicar las series
                List<ExerciseSet> originalSets = exerciseSetRepository.findByRoutineExerciseIdOrderBySetNumber(originalExercise.getId());

                for (ExerciseSet originalSet : originalSets) {
                    ExerciseSet duplicatedSet = ExerciseSet.builder()
                            .routineExercise(savedDuplicatedExercise)
                            .setNumber(originalSet.getSetNumber())
                            .targetRepsMin(originalSet.getTargetRepsMin())
                            .targetRepsMax(originalSet.getTargetRepsMax())
                            .targetWeight(originalSet.getTargetWeight())
                            .rir(originalSet.getRir())
                            .rpe(originalSet.getRpe())
                            .notes(originalSet.getNotes())
                            .build();

                    exerciseSetRepository.save(duplicatedSet);
                }
            }

            logger.info("Rutina duplicada exitosamente: {} → {}", originalRoutine.getName(), newName);

            RoutineResponse response = convertToFullResponse(savedDuplicatedRoutine);
            return ResponseEntity.ok(Map.of(
                    "routine", response,
                    "message", String.format("Rutina duplicada exitosamente como '%s'", newName),
                    "originalRoutineName", originalRoutine.getName(),
                    "duplicatedRoutineName", newName,
                    "duplicated", true
            ));

        } catch (Exception e) {
            logger.error("Error al duplicar rutina", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al duplicar la rutina: " + e.getMessage()));
        }
    }

    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElse(null);
    }

    private String generateDuplicateName(String originalName, Usuario usuario) {
        String baseName = originalName;
        int counter = 1;
        String newName;

        do {
            newName = String.format("%s (Copia %d)", baseName, counter);
            counter++;
        } while (routineRepository.existsByCreatedByAndNameIgnoreCaseAndIsActiveTrue(usuario, newName));

        return newName;
    }

    private void createRoutineExercise(Routine routine, CreateRoutineExerciseDTO exerciseDTO) {
        Optional<Exercise> exerciseOpt = exerciseRepository.findById(exerciseDTO.getExerciseId());
        if (exerciseOpt.isEmpty()) {
            throw new RuntimeException("Ejercicio no encontrado: " + exerciseDTO.getExerciseId());
        }

        Exercise exercise = exerciseOpt.get();

        RoutineExercise routineExercise = RoutineExercise.builder()
                .routine(routine)
                .exercise(exercise)
                .order(exerciseDTO.getOrder())
                .numberOfSets(exerciseDTO.getNumberOfSets())
                .restBetweenSets(exerciseDTO.getRestBetweenSets())
                .notes(exerciseDTO.getNotes())
                .build();

        RoutineExercise savedRoutineExercise = routineExerciseRepository.save(routineExercise);

        if (exerciseDTO.getSets() != null && !exerciseDTO.getSets().isEmpty()) {
            for (CreateExerciseSetDTO setDTO : exerciseDTO.getSets()) {
                ExerciseSet exerciseSet = ExerciseSet.builder()
                        .routineExercise(savedRoutineExercise)
                        .setNumber(setDTO.getSetNumber())
                        .targetRepsMin(setDTO.getTargetRepsMin())
                        .targetRepsMax(setDTO.getTargetRepsMax())
                        .targetWeight(setDTO.getTargetWeight())
                        .rir(setDTO.getRir())
                        .rpe(setDTO.getRpe())
                        .notes(setDTO.getNotes())
                        .build();

                exerciseSetRepository.save(exerciseSet);
            }
        }
    }

    private RoutineListResponse convertToListResponse(Routine routine) {
        int totalExercises = routine.getRoutineExercises() != null ? routine.getRoutineExercises().size() : 0;
        int totalSets = routine.getRoutineExercises() != null ?
                routine.getRoutineExercises().stream()
                        .mapToInt(re -> re.getSets() != null ? re.getSets().size() : 0)
                        .sum() : 0;

        return RoutineListResponse.builder()
                .id(routine.getId())
                .name(routine.getName())
                .description(routine.getDescription())
                .createdAt(routine.getCreatedAt())
                .updatedAt(routine.getUpdatedAt())
                .isActive(routine.isActive())
                .totalExercises(totalExercises)
                .totalSets(totalSets)
                .build();
    }

    private RoutineResponse convertToFullResponse(Routine routine) {
        List<RoutineExerciseResponse> exercises = routineExerciseRepository
                .findByRoutineIdOrderByOrder(routine.getId())
                .stream()
                .map(this::convertToExerciseResponse)
                .collect(Collectors.toList());

        return RoutineResponse.builder()
                .id(routine.getId())
                .name(routine.getName())
                .description(routine.getDescription())
                .createdByUsername(routine.getCreatedBy().getUsername())
                .createdAt(routine.getCreatedAt())
                .updatedAt(routine.getUpdatedAt())
                .isActive(routine.isActive())
                .exercises(exercises)
                .build();
    }

    private RoutineExerciseResponse convertToExerciseResponse(RoutineExercise routineExercise) {
        List<ExerciseSetResponse> sets = exerciseSetRepository
                .findByRoutineExerciseIdOrderBySetNumber(routineExercise.getId())
                .stream()
                .map(this::convertToSetResponse)
                .collect(Collectors.toList());

        return RoutineExerciseResponse.builder()
                .id(routineExercise.getId())
                .exerciseId(routineExercise.getExercise().getId())
                .exerciseName(routineExercise.getExercise().getName())
                .exerciseMuscle(routineExercise.getExercise().getMuscle())
                .order(routineExercise.getOrder())
                .numberOfSets(routineExercise.getNumberOfSets())
                .restBetweenSets(routineExercise.getRestBetweenSets())
                .notes(routineExercise.getNotes())
                .sets(sets)
                .build();
    }

    private ExerciseSetResponse convertToSetResponse(ExerciseSet exerciseSet) {
        return ExerciseSetResponse.builder()
                .id(exerciseSet.getId())
                .setNumber(exerciseSet.getSetNumber())
                .targetRepsMin(exerciseSet.getTargetRepsMin())
                .targetRepsMax(exerciseSet.getTargetRepsMax())
                .targetWeight(exerciseSet.getTargetWeight())
                .rir(exerciseSet.getRir())
                .rpe(exerciseSet.getRpe())
                .notes(exerciseSet.getNotes())
                .actualReps(exerciseSet.getActualReps())
                .actualWeight(exerciseSet.getActualWeight())
                .actualRir(exerciseSet.getActualRir())
                .completed(exerciseSet.getCompleted())
                .build();
    }
}