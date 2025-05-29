package com.example.demo.rest;

import com.example.demo.dto.*;
import com.example.demo.model.*;
import com.example.demo.repository.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
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

    public RoutineController(
            RoutineRepository routineRepository,
            RoutineExerciseRepository routineExerciseRepository,
            ExerciseSetRepository exerciseSetRepository,
            ExerciseRepository exerciseRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.routineRepository = routineRepository;
        this.routineExerciseRepository = routineExerciseRepository;
        this.exerciseSetRepository = exerciseSetRepository;
        this.exerciseRepository = exerciseRepository;
        this.usuarioRepository = usuarioRepository;
    }

    // Obtener todas las rutinas del usuario
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

    // Obtener rutina completa por ID
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

        // Verificar que la rutina pertenece al usuario
        if (!routine.getCreatedBy().getId().equals(usuario.getId())) {
            return ResponseEntity.status(403).build();
        }

        RoutineResponse response = convertToFullResponse(routine);
        return ResponseEntity.ok(response);
    }

    // Crear nueva rutina
    @PostMapping
    @Transactional
    public ResponseEntity<?> createRoutine(@RequestBody CreateRoutineDTO routineDTO) {
        logger.info("Creando nueva rutina: {}", routineDTO.getName());

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            // Crear la rutina principal
            Routine routine = Routine.builder()
                    .name(routineDTO.getName())
                    .description(routineDTO.getDescription())
                    .createdBy(usuario)
                    .isActive(true)
                    .build();

            Routine savedRoutine = routineRepository.save(routine);

            // Crear los ejercicios de la rutina
            if (routineDTO.getExercises() != null && !routineDTO.getExercises().isEmpty()) {
                for (CreateRoutineExerciseDTO exerciseDTO : routineDTO.getExercises()) {
                    createRoutineExercise(savedRoutine, exerciseDTO);
                }
            }

            logger.info("Rutina creada con ID: {}", savedRoutine.getId());

            // Devolver la rutina completa
            RoutineResponse response = convertToFullResponse(savedRoutine);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error al crear rutina", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al crear la rutina: " + e.getMessage()));
        }
    }

    // Actualizar rutina existente
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

        // Verificar que la rutina pertenece al usuario
        if (!routine.getCreatedBy().getId().equals(usuario.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No tienes permisos para modificar esta rutina"));
        }

        try {
            // Actualizar datos básicos
            routine.setName(routineDTO.getName());
            routine.setDescription(routineDTO.getDescription());

            // Eliminar ejercicios existentes
            routineExerciseRepository.deleteByRoutineId(routine.getId());

            // Crear nuevos ejercicios
            if (routineDTO.getExercises() != null && !routineDTO.getExercises().isEmpty()) {
                for (CreateRoutineExerciseDTO exerciseDTO : routineDTO.getExercises()) {
                    createRoutineExercise(routine, exerciseDTO);
                }
            }

            Routine savedRoutine = routineRepository.save(routine);
            logger.info("Rutina actualizada correctamente");

            RoutineResponse response = convertToFullResponse(savedRoutine);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error al actualizar rutina", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al actualizar la rutina: " + e.getMessage()));
        }
    }

    // Actualizar método deleteRoutine en RoutineController.java
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteRoutine(@PathVariable Long id) {
        logger.info("Eliminando rutina con ID: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        Optional<Routine> routineOpt = routineRepository.findById(id);
        if (routineOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Routine routine = routineOpt.get();

        // Verificar que la rutina pertenece al usuario
        if (!routine.getCreatedBy().getId().equals(usuario.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "No tienes permisos para eliminar esta rutina"));
        }

        try {
            // ELIMINACIÓN FÍSICA COMPLETA
            // 1. Eliminar primero las series (ExerciseSet)
            List<RoutineExercise> routineExercises = routineExerciseRepository.findByRoutineIdOrderByOrder(routine.getId());
            for (RoutineExercise routineExercise : routineExercises) {
                exerciseSetRepository.deleteByRoutineExerciseId(routineExercise.getId());
            }

            // 2. Eliminar los ejercicios de rutina (RoutineExercise)
            routineExerciseRepository.deleteByRoutineId(routine.getId());

            // 3. Finalmente eliminar la rutina
            routineRepository.delete(routine);

            logger.info("Rutina eliminada completamente de la base de datos");
            return ResponseEntity.ok(Map.of("mensaje", "Rutina eliminada correctamente"));

        } catch (Exception e) {
            logger.error("Error al eliminar rutina", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al eliminar la rutina"));
        }
    }

    // Métodos auxiliares
    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElse(null);
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

        // Crear las series
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